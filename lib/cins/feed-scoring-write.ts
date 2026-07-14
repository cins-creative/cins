import "server-only";

import type { Block } from "@/lib/editor/types";
import {
  FEED_SCORE,
  clampDiemThanhPhan,
  tinhDiemNoiDung,
  tinhDiemVerify,
  type FeedScoringLoai,
} from "@/lib/cins/feed-scoring";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type UpsertDiemFeedInput = {
  loai: FeedScoringLoai;
  id: string;
  coverId?: string | null;
  moTa?: string | null;
  blocks?: ReadonlyArray<Block> | null;
  hasTag?: boolean;
  /** Loại 2 verified — chỉ cot_moc. */
  daXacNhan?: boolean;
  /** Override gốc decay (mặc định now). */
  batDauLuc?: string | Date;
  diemCoBan?: number;
  dayBoi?: string | null;
  dayLuc?: string | Date | null;
  /** Giữ engagement/verify/noi_dung hiện có khi chỉ reset boost. */
  preserveExistingThanhPhan?: boolean;
};

type ExistingRow = {
  diem_noi_dung: number;
  diem_verify: number;
  diem_engagement: number;
  engagement_can_tinh_lai: boolean;
};

/**
 * Upsert một dòng `content_diem_feed` (service-role).
 * Dùng khi đăng bài mới / admin đẩy / backfill.
 */
export async function upsertContentDiemFeed(
  input: UpsertDiemFeedInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = input.id?.trim();
  if (!id || (input.loai !== "cot_moc" && input.loai !== "org_bai_dang")) {
    return { ok: false, message: "Thiếu loai hoặc id đối tượng." };
  }

  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const batDauIso =
    input.batDauLuc instanceof Date
      ? input.batDauLuc.toISOString()
      : typeof input.batDauLuc === "string" && input.batDauLuc.trim()
        ? input.batDauLuc
        : nowIso;
  const dayLucIso =
    input.dayLuc == null
      ? null
      : input.dayLuc instanceof Date
        ? input.dayLuc.toISOString()
        : input.dayLuc;

  let existing: ExistingRow | null = null;
  if (input.preserveExistingThanhPhan) {
    const { data } = await admin
      .from("content_diem_feed")
      .select(
        "diem_noi_dung, diem_verify, diem_engagement, engagement_can_tinh_lai",
      )
      .eq("loai_doi_tuong", input.loai)
      .eq("id_doi_tuong", id)
      .maybeSingle<ExistingRow>();
    existing = data ?? null;
  }

  const diemNoiDung = existing
    ? existing.diem_noi_dung
    : tinhDiemNoiDung({
        coverId: input.coverId,
        moTa: input.moTa,
        blocks: input.blocks,
        hasTag: Boolean(input.hasTag),
      });
  const diemVerify = existing
    ? existing.diem_verify
    : tinhDiemVerify(Boolean(input.daXacNhan));
  const diemEngagement = existing ? existing.diem_engagement : 0;

  const clamped = clampDiemThanhPhan({
    diem_co_ban: input.diemCoBan ?? FEED_SCORE.BASE,
    diem_noi_dung: diemNoiDung,
    diem_verify: diemVerify,
    diem_engagement: diemEngagement,
  });

  const payload = {
    loai_doi_tuong: input.loai,
    id_doi_tuong: id,
    ...clamped,
    engagement_can_tinh_lai: existing?.engagement_can_tinh_lai ?? false,
    bat_dau_luc: batDauIso,
    day_boi: input.dayBoi ?? null,
    day_luc: dayLucIso,
    cap_nhat_luc: nowIso,
  };

  const { error } = await admin.from("content_diem_feed").upsert(payload, {
    onConflict: "loai_doi_tuong,id_doi_tuong",
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Đăng bài mới — điểm cơ bản 40, không verify. */
export async function insertDiemFeedChoBaiMoi(input: {
  loai: FeedScoringLoai;
  id: string;
  coverId?: string | null;
  moTa?: string | null;
  blocks?: ReadonlyArray<Block> | null;
  hasTag?: boolean;
  batDauLuc?: string | Date;
}): Promise<void> {
  const result = await upsertContentDiemFeed({
    ...input,
    diemCoBan: FEED_SCORE.BASE,
    daXacNhan: false,
  });
  if (!result.ok) {
    console.error("[feed-scoring] insert bài mới thất bại:", result.message);
  }
}

async function loadContentSnapshotForDiem(
  loai: FeedScoringLoai,
  id: string,
): Promise<{
  coverId: string | null;
  moTa: string | null;
  blocks: Block[] | null;
  hasTag: boolean;
}> {
  const admin = createServiceRoleClient();
  if (loai === "org_bai_dang") {
    const { data } = await admin
      .from("org_bai_dang")
      .select("tom_tat, cover_id, noi_dung_blocks")
      .eq("id", id)
      .maybeSingle<{
        tom_tat: string | null;
        cover_id: string | null;
        noi_dung_blocks: Block[] | null;
      }>();
    const { count } = await admin
      .from("org_bai_dang_tag")
      .select("id_bai_viet", { count: "exact", head: true })
      .eq("id_bai_dang", id);
    return {
      coverId: data?.cover_id ?? null,
      moTa: data?.tom_tat ?? null,
      blocks: Array.isArray(data?.noi_dung_blocks) ? data!.noi_dung_blocks : null,
      hasTag: (count ?? 0) > 0,
    };
  }

  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("mo_ta")
    .eq("id", id)
    .maybeSingle<{ mo_ta: string | null }>();
  const { data: link } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham")
    .eq("id_cot_moc", id)
    .order("thu_tu", { ascending: true })
    .limit(1)
    .maybeSingle<{ id_tac_pham: string }>();

  let coverId: string | null = null;
  let blocks: Block[] | null = null;
  let moTa = moc?.mo_ta ?? null;
  if (link?.id_tac_pham) {
    const { data: tp } = await admin
      .from("content_tac_pham")
      .select("cover_id, mo_ta, noi_dung_blocks")
      .eq("id", link.id_tac_pham)
      .maybeSingle<{
        cover_id: string | null;
        mo_ta: string | null;
        noi_dung_blocks: Block[] | null;
      }>();
    coverId = tp?.cover_id ?? null;
    blocks = Array.isArray(tp?.noi_dung_blocks) ? tp!.noi_dung_blocks : null;
    if (!moTa?.trim() && tp?.mo_ta?.trim()) moTa = tp.mo_ta;
  }

  const { count } = await admin
    .from("article_gan_cot_moc")
    .select("id_bai_viet", { count: "exact", head: true })
    .eq("id_cot_moc", id);

  return {
    coverId,
    moTa,
    blocks,
    hasTag: (count ?? 0) > 0,
  };
}

/**
 * Admin đẩy bài — reset diem_co_ban=100, bat_dau_luc=now, giữ thành phần khác.
 * Tắt boost: không xoá dòng điểm (chỉ hết bonus qua content_world_boost).
 */
export async function applyAdminDayBaiDiemFeed(input: {
  loai: FeedScoringLoai;
  id: string;
  actorProfileId: string;
  dangBat: boolean;
}): Promise<void> {
  if (input.loai !== "cot_moc" && input.loai !== "org_bai_dang") {
    return;
  }
  if (!input.dangBat) {
    /* Tắt boost: không đụng content_diem_feed (brief). */
    return;
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("content_diem_feed")
    .select("id")
    .eq("loai_doi_tuong", input.loai)
    .eq("id_doi_tuong", input.id)
    .maybeSingle<{ id: string }>();

  const snap = existing
    ? null
    : await loadContentSnapshotForDiem(input.loai, input.id);

  const now = new Date();
  const result = await upsertContentDiemFeed({
    loai: input.loai,
    id: input.id,
    coverId: snap?.coverId,
    moTa: snap?.moTa,
    blocks: snap?.blocks,
    hasTag: snap?.hasTag,
    diemCoBan: FEED_SCORE.BOOST_RESET_SCORE,
    batDauLuc: now,
    dayBoi: input.actorProfileId,
    dayLuc: now,
    preserveExistingThanhPhan: Boolean(existing),
  });
  if (!result.ok) {
    console.error("[feed-scoring] admin đẩy thất bại:", result.message);
  }
}

/** Đánh dấu cần tính lại engagement (hook 4.3). */
export async function markEngagementCanTinhLai(
  loai: FeedScoringLoai,
  id: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_diem_feed")
    .update({
      engagement_can_tinh_lai: true,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("loai_doi_tuong", loai)
    .eq("id_doi_tuong", id);
  if (error) {
    console.error("[feed-scoring] mark engagement thất bại:", error.message);
  }
}

/** Cho route polymorphic — chỉ `cot_moc` / `org_bai_dang`. */
export async function markEngagementCanTinhLaiForTarget(
  loai: string | null | undefined,
  id: string | null | undefined,
): Promise<void> {
  const loaiTrim = loai?.trim();
  const idTrim = id?.trim();
  if (!idTrim) return;
  if (loaiTrim !== "cot_moc" && loaiTrim !== "org_bai_dang") return;
  await markEngagementCanTinhLai(loaiTrim, idTrim);
}

/** Verify Loại 2 — set diem_verify = 20 (hook 4.2). */
export async function setDiemVerifyChoCotMoc(cotMocId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_diem_feed")
    .update({
      diem_verify: FEED_SCORE.VERIFIED,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", cotMocId);
  if (error) {
    console.error("[feed-scoring] set verify thất bại:", error.message);
  }
}

/** Sửa bài — recalc diem_noi_dung (hook 4.5). */
export async function recalcDiemNoiDung(input: {
  loai: FeedScoringLoai;
  id: string;
  coverId?: string | null;
  moTa?: string | null;
  blocks?: ReadonlyArray<Block> | null;
  hasTag?: boolean;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const diem = tinhDiemNoiDung({
    coverId: input.coverId,
    moTa: input.moTa,
    blocks: input.blocks,
    hasTag: Boolean(input.hasTag),
  });
  const { error } = await admin
    .from("content_diem_feed")
    .update({
      diem_noi_dung: diem,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("loai_doi_tuong", input.loai)
    .eq("id_doi_tuong", input.id);
  if (error) {
    console.error("[feed-scoring] recalc nội dung thất bại:", error.message);
  }
}
