import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";
import { orgSuKienHref } from "@/lib/to-chuc/su-kien-routes";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { getStepStatus } from "@/lib/truong/timeline";

/** Tối thiểu bạn bè đăng ký "sẽ tham gia" để gợi ý sự kiện trên feed. */
export const MIN_FRIENDS_FOR_EVENT_SUGGESTION = 2;

type OrgEmbed = {
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type SuKienFeedRow = {
  id: string;
  ten: string;
  mo_ta: string | null;
  cover_id: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  loai_su_kien: string | null;
  id_to_chuc: string;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

const TRANG_THAI_HUY = new Set(["tu_choi", "huy"]);

function pickOrg(org: SuKienFeedRow["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? (org[0] ?? null) : org;
}

function orgKindFromLoai(
  loai: string | null | undefined,
): NonNullable<MilestoneItem["attribution"]>["orgKind"] {
  if (loai === "cong_dong") return "cong_dong";
  if (loai === "co_so_dao_tao") return "co_so_dao_tao";
  if (loai === "studio" || loai === "doanh_nghiep") return "studio";
  return "truong";
}

function calendarParts(iso: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function mapSuKienToMilestone(
  row: SuKienFeedRow,
  options: {
    feedSuggestion?: boolean;
    friendCount?: number;
  } = {},
): MilestoneItem | null {
  const org = pickOrg(row.org_to_chuc);
  if (!org?.slug?.trim() || !org.ten?.trim()) return null;

  const status = getStepStatus(row.bat_dau, row.ket_thuc);
  if (status === "done") return null;

  const parts = calendarParts(row.bat_dau);
  if (!parts) return null;

  const orgSlug = org.slug.trim();
  const orgName = org.ten.trim();
  const orgLoai = org.loai_to_chuc?.trim() ?? "co_so_dao_tao";
  const avatarId = org.avatar_id ?? org.logo_id;
  const avatarUrl = avatarId
    ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
    : null;
  const href = orgSuKienHref(orgLoai, orgSlug);
  const coverSrc = row.cover_id
    ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
    : null;

  const friendCount = options.friendCount ?? 0;
  let feedSocialHint: string | null = null;
  if (friendCount >= MIN_FRIENDS_FOR_EVENT_SUGGESTION) {
    feedSocialHint = `${friendCount} bạn bè sẽ tham gia`;
  }

  return {
    id: `org-event:${row.id}`,
    cotMocId: row.id,
    variant: "tagged",
    type: "su-kien",
    visibility: "public",
    year: parts.year,
    month: parts.month,
    day: parts.day,
    createdAt: row.bat_dau,
    title: row.ten?.trim() || "Sự kiện",
    body: row.mo_ta?.trim() || null,
    media: coverSrc
      ? [
          {
            src: coverSrc,
            width: 800,
            height: 450,
            label: row.ten?.trim() || null,
          },
        ]
      : undefined,
    orgSuKienRef: {
      suKienId: row.id,
      orgId: row.id_to_chuc,
      orgSlug,
      orgName,
      orgLoai,
      href,
      batDau: row.bat_dau,
      ketThuc: row.ket_thuc,
      loaiSuKien: row.loai_su_kien,
    },
    attribution: {
      name: orgName,
      role: labelLoaiSuKien(row.loai_su_kien),
      avatarUrl,
      initial: orgName.slice(0, 1).toUpperCase(),
      slug: orgSlug,
      isOrg: true,
      orgKind: orgKindFromLoai(orgLoai),
      href,
    },
    lensOwnerSlug: orgSlug,
    lensOwnerName: orgName,
    lensOwnerAvatarUrl: avatarUrl,
    orgHref: href,
    feedSuggestion: options.feedSuggestion === true,
    feedSocialHint,
  };
}

async function fetchUpcomingSuKienRows(params: {
  orgIds?: string[];
  suKienIds?: string[];
  excludeIds?: Set<string>;
  limit: number;
}): Promise<SuKienFeedRow[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const excludeIds = params.excludeIds ?? new Set<string>();

  let query = admin
    .from("org_su_kien")
    .select(
      `
      id,
      ten,
      mo_ta,
      cover_id,
      bat_dau,
      ket_thuc,
      loai_su_kien,
      id_to_chuc,
      org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )
    `,
    )
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: false })
    .limit(params.limit + excludeIds.size + 6);

  if (params.suKienIds?.length) {
    query = query.in("id", params.suKienIds);
  } else if (params.orgIds?.length) {
    query = query.in("id_to_chuc", params.orgIds);
  }

  const { data } = await query.returns<SuKienFeedRow[]>();
  const out: SuKienFeedRow[] = [];
  for (const row of data ?? []) {
    if (excludeIds.has(row.id)) continue;
    out.push(row);
    if (out.length >= params.limit) break;
  }
  return out;
}

/** Sự kiện sắp diễn ra từ org đang theo dõi → card timeline feed giữa. */
export async function fetchFollowedOrgSuKienMilestones(
  orgIds: string[],
  limit = 20,
): Promise<MilestoneItem[]> {
  if (orgIds.length === 0) return [];

  const rows = await fetchUpcomingSuKienRows({ orgIds, limit });
  const items: MilestoneItem[] = [];
  for (const row of rows) {
    const item = mapSuKienToMilestone(row);
    if (item) items.push(item);
  }
  return items;
}

async function countFriendsParticipatingBySuKien(
  friendIds: string[],
  suKienIds?: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (friendIds.length === 0) return counts;

  const admin = createServiceRoleClient();
  let query = admin
    .from("org_dang_ky_su_kien")
    .select("id_su_kien, loai_phan_hoi, trang_thai")
    .in("id_nguoi_dung", friendIds)
    .eq("loai_phan_hoi", "se_tham_gia");

  if (suKienIds?.length) {
    query = query.in("id_su_kien", suKienIds);
  }

  const { data } = await query.returns<
    Array<{ id_su_kien: string; loai_phan_hoi: string; trang_thai: string }>
  >();

  for (const row of data ?? []) {
    if (TRANG_THAI_HUY.has(row.trang_thai)) continue;
    counts.set(row.id_su_kien, (counts.get(row.id_su_kien) ?? 0) + 1);
  }
  return counts;
}

/**
 * Gợi ý sự kiện khi ≥ `MIN_FRIENDS_FOR_EVENT_SUGGESTION` bạn bè đăng ký tham gia.
 * Bỏ qua sự kiện đã có từ org đang follow (dedupe ở tầng merge).
 */
export async function fetchFriendSuggestedSuKienMilestones(
  friendIds: string[],
  excludeSuKienIds: Set<string> = new Set(),
  limit = 12,
): Promise<MilestoneItem[]> {
  if (friendIds.length === 0) return [];

  const friendCounts = await countFriendsParticipatingBySuKien(friendIds);
  const candidateIds = [...friendCounts.entries()]
    .filter(
      ([id, count]) =>
        count >= MIN_FRIENDS_FOR_EVENT_SUGGESTION && !excludeSuKienIds.has(id),
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit + excludeSuKienIds.size)
    .map(([id]) => id);

  if (candidateIds.length === 0) return [];

  const rows = await fetchUpcomingSuKienRows({
    suKienIds: candidateIds,
    limit: candidateIds.length,
  });

  const byFriendCount = friendCounts;
  const items: MilestoneItem[] = [];
  for (const row of rows) {
    const friendCount = byFriendCount.get(row.id) ?? 0;
    if (friendCount < MIN_FRIENDS_FOR_EVENT_SUGGESTION) continue;
    const item = mapSuKienToMilestone(row, {
      feedSuggestion: true,
      friendCount,
    });
    if (item) items.push(item);
  }

  items.sort(
    (a, b) =>
      (byFriendCount.get(b.cotMocId ?? "") ?? 0) -
      (byFriendCount.get(a.cotMocId ?? "") ?? 0),
  );

  return items.slice(0, limit);
}
