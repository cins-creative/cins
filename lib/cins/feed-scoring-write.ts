import "server-only";

import type { Block } from "@/lib/editor/types";
import { loadFeedScoreConfig } from "@/lib/cins/feed-scoring-config-db";
import {
  ADMIN_DIEM_UU_TIEN,
  clampDiemThanhPhan,
  tinhDiemEngagement,
  tinhDiemNoiDung,
  tinhDiemVerify,
  tongDonViEngagement,
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

  const cfg = await loadFeedScoreConfig();
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
    : tinhDiemNoiDung(
        {
          coverId: input.coverId,
          moTa: input.moTa,
          blocks: input.blocks,
          hasTag: Boolean(input.hasTag),
        },
        cfg,
      );
  const diemVerify = existing
    ? existing.diem_verify
    : tinhDiemVerify(Boolean(input.daXacNhan), cfg);
  const diemEngagement = existing ? existing.diem_engagement : 0;

  const clamped = clampDiemThanhPhan(
    {
      diem_co_ban: input.diemCoBan ?? cfg.BASE,
      diem_noi_dung: diemNoiDung,
      diem_verify: diemVerify,
      diem_engagement: diemEngagement,
    },
    cfg,
  );

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

/** Đăng bài mới — điểm cơ bản từ config, không verify. */
export async function insertDiemFeedChoBaiMoi(input: {
  loai: FeedScoringLoai;
  id: string;
  coverId?: string | null;
  moTa?: string | null;
  blocks?: ReadonlyArray<Block> | null;
  hasTag?: boolean;
  batDauLuc?: string | Date;
}): Promise<void> {
  const cfg = await loadFeedScoreConfig();
  const result = await upsertContentDiemFeed({
    ...input,
    diemCoBan: cfg.BASE,
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

async function loadTaoLucDoiTuong(
  loai: FeedScoringLoai,
  id: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (loai === "org_bai_dang") {
    const { data } = await admin
      .from("org_bai_dang")
      .select("tao_luc")
      .eq("id", id)
      .maybeSingle<{ tao_luc: string }>();
    return data?.tao_luc ?? null;
  }
  const { data } = await admin
    .from("content_cot_moc")
    .select("tao_luc")
    .eq("id", id)
    .maybeSingle<{ tao_luc: string }>();
  return data?.tao_luc ?? null;
}

/**
 * Admin đẩy bài — điểm luôn theo `content_world_boost.dang_bat` hiện tại
 * (không tin request cũ khi toggle đua nhau).
 * ON: diem_co_ban=BOOST_RESET, bat_dau_luc=now.
 * OFF: trả về BASE + decay từ tao_luc bài, giữ nội dung/verify/engagement.
 */
export async function applyAdminDayBaiDiemFeed(input: {
  loai: FeedScoringLoai;
  id: string;
  actorProfileId: string;
  /** Gợi ý từ caller — có thể bị override bởi trạng thái boost thật trong DB. */
  dangBat: boolean;
}): Promise<void> {
  if (input.loai !== "cot_moc" && input.loai !== "org_bai_dang") {
    return;
  }

  const cfg = await loadFeedScoreConfig();
  const admin = createServiceRoleClient();

  const { data: boostRow } = await admin
    .from("content_world_boost")
    .select("dang_bat")
    .eq("loai_doi_tuong", input.loai)
    .eq("id_doi_tuong", input.id)
    .maybeSingle<{ dang_bat: boolean }>();

  /* DB là nguồn sự thật — tránh request ON chậm ghi đè sau khi đã tắt. */
  const dangBat = Boolean(boostRow?.dang_bat);

  const { data: existing } = await admin
    .from("content_diem_feed")
    .select("id")
    .eq("loai_doi_tuong", input.loai)
    .eq("id_doi_tuong", input.id)
    .maybeSingle<{ id: string }>();

  if (!dangBat) {
    if (!existing) return;
    const taoLuc = await loadTaoLucDoiTuong(input.loai, input.id);
    const nowIso = new Date().toISOString();
    const { error } = await admin
      .from("content_diem_feed")
      .update({
        diem_co_ban: cfg.BASE,
        bat_dau_luc: taoLuc ?? nowIso,
        day_boi: null,
        day_luc: null,
        cap_nhat_luc: nowIso,
      })
      .eq("loai_doi_tuong", input.loai)
      .eq("id_doi_tuong", input.id);
    if (error) {
      console.error(
        "[feed-scoring] tắt đẩy — khôi phục điểm thất bại:",
        error.message,
      );
    }
    return;
  }

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
    diemCoBan: cfg.BOOST_RESET_SCORE,
    batDauLuc: now,
    dayBoi: input.actorProfileId,
    dayLuc: now,
    preserveExistingThanhPhan: Boolean(existing),
  });
  if (!result.ok) {
    console.error("[feed-scoring] admin đẩy thất bại:", result.message);
  }
}

/**
 * Cộng điểm ưu tiên admin (+BUMP, không hoàn lại).
 * Không đụng L29 boost; vẫn giữ khi ON/OFF đẩy (cột riêng diem_uu_tien).
 * Đồng thời reset bat_dau_luc = now để đẩy bài lên đầu cửa sổ decay.
 */
export async function bumpAdminDiemUuTien(input: {
  loai: FeedScoringLoai;
  id: string;
  actorProfileId: string;
}): Promise<
  | {
      ok: true;
      diemUuTien: number;
      bumped: number;
    }
  | { ok: false; message: string }
> {
  if (input.loai !== "cot_moc" && input.loai !== "org_bai_dang") {
    return {
      ok: false,
      message: "Chỉ cộng điểm cho bài user / bài org (không sự kiện).",
    };
  }

  const id = input.id.trim();
  if (!id) return { ok: false, message: "Thiếu id đối tượng." };

  const admin = createServiceRoleClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: existing } = await admin
    .from("content_diem_feed")
    .select("diem_uu_tien")
    .eq("loai_doi_tuong", input.loai)
    .eq("id_doi_tuong", id)
    .maybeSingle<{ diem_uu_tien: number | null }>();

  if (!existing) {
    const snap = await loadContentSnapshotForDiem(input.loai, id);
    const cfg = await loadFeedScoreConfig();
    const inserted = await upsertContentDiemFeed({
      loai: input.loai,
      id,
      coverId: snap.coverId,
      moTa: snap.moTa,
      blocks: snap.blocks,
      hasTag: snap.hasTag,
      diemCoBan: cfg.BASE,
      batDauLuc: now,
      dayBoi: input.actorProfileId,
      dayLuc: now,
    });
    if (!inserted.ok) {
      return { ok: false, message: inserted.message };
    }
  }

  const current = Math.max(0, Math.round(existing?.diem_uu_tien ?? 0));
  if (current >= ADMIN_DIEM_UU_TIEN.MAX) {
    return {
      ok: false,
      message: `Đã đạt trần ưu tiên (${ADMIN_DIEM_UU_TIEN.MAX}).`,
    };
  }

  const next = Math.min(
    ADMIN_DIEM_UU_TIEN.MAX,
    current + ADMIN_DIEM_UU_TIEN.BUMP,
  );
  const bumped = next - current;

  const { error } = await admin
    .from("content_diem_feed")
    .update({
      diem_uu_tien: next,
      bat_dau_luc: nowIso,
      day_boi: input.actorProfileId,
      day_luc: nowIso,
      cap_nhat_luc: nowIso,
    })
    .eq("loai_doi_tuong", input.loai)
    .eq("id_doi_tuong", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, diemUuTien: next, bumped };
}

/**
 * Sửa bài còn diem_co_ban = BOOST_RESET nhưng boost đã tắt / không còn.
 * Gọi lazy khi load catalog admin.
 */
export async function healOrphanBoostDiemFeedScores(): Promise<number> {
  const cfg = await loadFeedScoreConfig();
  const admin = createServiceRoleClient();
  const reset = cfg.BOOST_RESET_SCORE;

  const { data: stuck } = await admin
    .from("content_diem_feed")
    .select("loai_doi_tuong, id_doi_tuong, diem_co_ban")
    .gte("diem_co_ban", reset)
    .in("loai_doi_tuong", ["cot_moc", "org_bai_dang"])
    .limit(100)
    .returns<
      Array<{
        loai_doi_tuong: FeedScoringLoai;
        id_doi_tuong: string;
        diem_co_ban: number;
      }>
    >();

  if (!stuck?.length) return 0;

  let healed = 0;
  for (const row of stuck) {
    const { data: boost } = await admin
      .from("content_world_boost")
      .select("dang_bat")
      .eq("loai_doi_tuong", row.loai_doi_tuong)
      .eq("id_doi_tuong", row.id_doi_tuong)
      .maybeSingle<{ dang_bat: boolean }>();

    if (boost?.dang_bat) continue;

    await applyAdminDayBaiDiemFeed({
      loai: row.loai_doi_tuong,
      id: row.id_doi_tuong,
      actorProfileId: "",
      dangBat: false,
    });
    healed += 1;
  }
  return healed;
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

/** Verify Loại 2 — set diem_verify theo config (hook 4.2). */
export async function setDiemVerifyChoCotMoc(cotMocId: string): Promise<void> {
  const cfg = await loadFeedScoreConfig();
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_diem_feed")
    .update({
      diem_verify: cfg.VERIFIED,
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
  const cfg = await loadFeedScoreConfig();
  const admin = createServiceRoleClient();
  const diem = tinhDiemNoiDung(
    {
      coverId: input.coverId,
      moTa: input.moTa,
      blocks: input.blocks,
      hasTag: Boolean(input.hasTag),
    },
    cfg,
  );
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

/** Đếm đơn vị engagement (reaction / comment / lưu theo config). */
export async function countEngagementUnits(
  loai: FeedScoringLoai,
  id: string,
): Promise<number> {
  const cfg = await loadFeedScoreConfig();
  const admin = createServiceRoleClient();
  const [reactions, comments, luu] = await Promise.all([
    admin
      .from("social_reaction")
      .select("id", { count: "exact", head: true })
      .eq("loai_doi_tuong", loai)
      .eq("id_doi_tuong", id)
      /* Chỉ like (heart) — dislike không cộng điểm engagement. */
      .eq("emoji", "heart"),
    admin
      .from("social_binh_luan")
      .select("id", { count: "exact", head: true })
      .eq("loai_doi_tuong", loai)
      .eq("id_doi_tuong", id)
      .eq("da_xoa", false),
    admin
      .from("social_luu")
      .select("id", { count: "exact", head: true })
      .eq("loai_doi_tuong", loai)
      .eq("id_doi_tuong", id),
  ]);

  return tongDonViEngagement(
    {
      reactions: reactions.count ?? 0,
      comments: comments.count ?? 0,
      luu: luu.count ?? 0,
    },
    cfg,
  );
}

/**
 * Lazy recalc (chốt Bước 5): khi feed đọc điểm dirty → đếm lại engagement,
 * ghi `diem_engagement`, clear flag. Cap `max` để không làm chậm 1 request.
 * Trả map key → diem_engagement mới.
 */
export async function flushDirtyEngagementScores(
  dirty: ReadonlyArray<{ loai: FeedScoringLoai; id: string }>,
  max = 40,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const slice = dirty.slice(0, Math.max(0, max));
  if (slice.length === 0) return out;

  const cfg = await loadFeedScoreConfig();
  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  await Promise.all(
    slice.map(async ({ loai, id }) => {
      try {
        const units = await countEngagementUnits(loai, id);
        const diem = tinhDiemEngagement(units, cfg);
        const { error } = await admin
          .from("content_diem_feed")
          .update({
            diem_engagement: diem,
            engagement_can_tinh_lai: false,
            cap_nhat_luc: nowIso,
          })
          .eq("loai_doi_tuong", loai)
          .eq("id_doi_tuong", id);
        if (!error) out.set(`${loai}:${id}`, diem);
      } catch (e) {
        console.error("[feed-scoring] flush engagement thất bại:", e);
      }
    }),
  );

  return out;
}
