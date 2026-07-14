import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  FEED_SCORE_DECAY_SECONDS,
  isWithinFeedDecayWindow,
  tinhDiemFallbackTuTaoLuc,
  tinhDiemHienTai,
  type ContentDiemFeed,
  type FeedScoringLoai,
} from "@/lib/cins/feed-scoring";
import { flushDirtyEngagementScores } from "@/lib/cins/feed-scoring-write";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type DiemFeedRow = ContentDiemFeed & {
  loai_doi_tuong: FeedScoringLoai;
  id_doi_tuong: string;
  engagement_can_tinh_lai?: boolean;
};

function scoreKey(loai: FeedScoringLoai, id: string): string {
  return `${loai}:${id}`;
}

/** Mục tiêu điểm — null = org_su_kien / không join được (fallback thời gian). */
export function feedScoreTargetFromMilestone(
  m: MilestoneItem,
): { loai: FeedScoringLoai; id: string } | null {
  if (m.orgSuKienRef?.suKienId) return null;
  if (m.orgBaiDangRef?.postId) {
    return { loai: "org_bai_dang", id: m.orgBaiDangRef.postId };
  }
  const cotMocId = m.cotMocId?.trim();
  if (cotMocId) return { loai: "cot_moc", id: cotMocId };
  return null;
}

function postedAtIso(m: MilestoneItem): string | null {
  const raw = m.feedSortAt ?? m.createdAt ?? null;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : raw;
}

/**
 * Load điểm đang sống (bat_dau_luc trong 7 ngày) cho pool feed.
 * Key: `cot_moc:uuid` | `org_bai_dang:uuid`.
 */
export async function loadActiveFeedScoreMap(
  targets: ReadonlyArray<{ loai: FeedScoringLoai; id: string }>,
): Promise<Map<string, ContentDiemFeed>> {
  const map = new Map<string, ContentDiemFeed>();
  if (targets.length === 0) return map;

  const cotMocIds = [
    ...new Set(
      targets.filter((t) => t.loai === "cot_moc").map((t) => t.id),
    ),
  ];
  const orgIds = [
    ...new Set(
      targets.filter((t) => t.loai === "org_bai_dang").map((t) => t.id),
    ),
  ];

  const sinceIso = new Date(
    Date.now() - FEED_SCORE_DECAY_SECONDS * 1000,
  ).toISOString();
  const admin = createServiceRoleClient();

  const dirty: Array<{ loai: FeedScoringLoai; id: string }> = [];

  async function loadLoai(loai: FeedScoringLoai, ids: string[]) {
    const chunkSize = 80;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const { data } = await admin
        .from("content_diem_feed")
        .select(
          "loai_doi_tuong, id_doi_tuong, diem_co_ban, diem_noi_dung, diem_verify, diem_engagement, bat_dau_luc, engagement_can_tinh_lai",
        )
        .eq("loai_doi_tuong", loai)
        .in("id_doi_tuong", slice)
        .gt("bat_dau_luc", sinceIso)
        .returns<DiemFeedRow[]>();

      for (const row of data ?? []) {
        map.set(scoreKey(row.loai_doi_tuong, row.id_doi_tuong), {
          diem_co_ban: row.diem_co_ban,
          diem_noi_dung: row.diem_noi_dung,
          diem_verify: row.diem_verify,
          diem_engagement: row.diem_engagement,
          bat_dau_luc: row.bat_dau_luc,
        });
        if (row.engagement_can_tinh_lai) {
          dirty.push({ loai: row.loai_doi_tuong, id: row.id_doi_tuong });
        }
      }
    }
  }

  await Promise.all([loadLoai("cot_moc", cotMocIds), loadLoai("org_bai_dang", orgIds)]);

  /* Lazy recalc engagement dirty trong pool đang rank (không pg_cron). */
  if (dirty.length > 0) {
    const flushed = await flushDirtyEngagementScores(dirty);
    for (const [key, diem] of flushed) {
      const prev = map.get(key);
      if (prev) map.set(key, { ...prev, diem_engagement: diem });
    }
  }

  return map;
}

export type ScoredMilestone = MilestoneItem & { feedScore: number };

/**
 * Gắn `feedScore` + lọc cửa sổ 7 ngày.
 * - Có dòng diem_feed sống → tinhDiemHienTai
 * - Chưa có dòng (cot_moc / org_bai_dang) → giữ nếu tao_luc trong 7 ngày, điểm fallback BASE×decay
 * - org_su_kien → luôn giữ (logic sự kiện riêng), điểm fallback theo feedSortAt/tao_luc
 */
export function attachFeedScoresAndFilter(
  items: ReadonlyArray<MilestoneItem>,
  scoreMap: ReadonlyMap<string, ContentDiemFeed>,
  nowMs: number = Date.now(),
): ScoredMilestone[] {
  const out: ScoredMilestone[] = [];

  for (const m of items) {
    const target = feedScoreTargetFromMilestone(m);
    const posted = postedAtIso(m);

    if (!target) {
      /* org_su_kien hoặc thiếu id — không cắt theo diem_feed. */
      const iso = posted ?? new Date(nowMs).toISOString();
      out.push({
        ...m,
        feedScore: tinhDiemFallbackTuTaoLuc(iso, nowMs),
      });
      continue;
    }

    const row = scoreMap.get(scoreKey(target.loai, target.id));
    if (row) {
      out.push({ ...m, feedScore: tinhDiemHienTai(row, nowMs) });
      continue;
    }

    /* Chưa có dòng / đã ra khỏi cửa sổ DB → fallback tao_luc trong 7 ngày. */
    if (!posted || !isWithinFeedDecayWindow(posted, nowMs)) continue;
    out.push({
      ...m,
      feedScore: tinhDiemFallbackTuTaoLuc(posted, nowMs),
    });
  }

  return out;
}
