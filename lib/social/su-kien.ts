import "server-only";

import { createHash } from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  MAX_SU_KIEN_BATCH,
  sanitizeSuKien,
  type SuKienInput,
} from "@/lib/social/su-kien-constants";

/** Hash phien_id của khách (không lưu giá trị thô — tránh PII/định danh ngược). */
export function hashPhienId(phienId: string | null | undefined): string | null {
  const raw = phienId?.trim();
  if (!raw) return null;
  const salt =
    process.env.SU_KIEN_SALT?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "cins-su-kien";
  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 32);
}

type RecordContext = {
  /** UUID người xem (đăng nhập) — null nếu khách. */
  nguoiXemId: string | null;
  /** phien_id thô từ client (sẽ hash). */
  phienIdRaw?: string | null;
};

/**
 * Ghi batch event vào `social_luot_xem` (qua service role).
 * Bỏ qua event không hợp lệ; trả số dòng đã ghi.
 */
export async function recordSuKien(
  rawEvents: unknown,
  ctx: RecordContext,
): Promise<{ ok: true; written: number } | { ok: false; error: string }> {
  if (!Array.isArray(rawEvents)) {
    return { ok: false, error: "events phải là mảng." };
  }
  const phienHash = hashPhienId(ctx.phienIdRaw);

  const rows: Array<Record<string, unknown>> = [];
  for (const raw of rawEvents.slice(0, MAX_SU_KIEN_BATCH)) {
    const ev = sanitizeSuKien(raw);
    if (!ev) continue;
    rows.push(toRow(ev, ctx.nguoiXemId, phienHash));
  }

  if (rows.length === 0) return { ok: true, written: 0 };

  const admin = createServiceRoleClient();
  const { error } = await admin.from("social_luot_xem").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, written: rows.length };
}

function toRow(
  ev: SuKienInput,
  nguoiXemId: string | null,
  phienHash: string | null,
): Record<string, unknown> {
  return {
    nguoi_xem: nguoiXemId,
    phien_id: phienHash,
    loai_su_kien: ev.loai_su_kien,
    loai_doi_tuong: ev.loai_doi_tuong,
    id_doi_tuong: ev.id_doi_tuong,
    nguon: ev.nguon ?? null,
    loai_boi_canh: ev.loai_boi_canh ?? null,
    id_boi_canh: ev.id_boi_canh ?? null,
    ngu_canh: ev.ngu_canh ?? null,
  };
}

/* ── Insight RIÊNG TƯ cho chủ bài ────────────────────────────────────── */

export type CotMocInsight = {
  luotTiepCan: number;
  tiepCanUnique: number;
  luotXemNoiDung: number;
  luotMoComment: number;
  luotClickProfile: number;
  luotXemMedia: number;
  luotClickLienKet: number;
};

const EMPTY_INSIGHT: CotMocInsight = {
  luotTiepCan: 0,
  tiepCanUnique: 0,
  luotXemNoiDung: 0,
  luotMoComment: 0,
  luotClickProfile: 0,
  luotXemMedia: 0,
  luotClickLienKet: 0,
};

/**
 * Kiểm tra requester có quyền xem số liệu của 1 cột mốc không.
 *  - Bài cá nhân (không gắn tổ chức): chỉ chủ bài.
 *  - Bài của tổ chức (`id_to_chuc`): chỉ **quản trị viên** tổ chức (vai trò
 *    `owner` / `admin`, thành viên đang active) — không lộ cho thành viên thường.
 */
export async function canViewCotMocInsight(
  cotMocId: string,
  requesterId: string | null,
): Promise<boolean> {
  if (!requesterId) return false;
  const admin = createServiceRoleClient();

  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, id_to_chuc")
    .eq("id", cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string; id_to_chuc: string | null }>();
  if (!moc) return false;

  if (moc.id_to_chuc) {
    const { data: membership } = await admin
      .from("user_thanh_vien_to_chuc")
      .select("vai_tro")
      .eq("id_to_chuc", moc.id_to_chuc)
      .eq("id_nguoi_dung", requesterId)
      .eq("trang_thai", "active")
      .in("vai_tro", ["owner", "admin"])
      .maybeSingle<{ vai_tro: string }>();
    return Boolean(membership);
  }

  return moc.id_nguoi_dung === requesterId;
}

/**
 * Đọc số liệu tổng hợp của 1 cột mốc — CHỈ người có quyền (chủ bài cá nhân
 * hoặc quản trị viên tổ chức). Trả null nếu không đủ quyền (phản-vanity).
 */
export async function getCotMocInsight(
  cotMocId: string,
  requesterId: string | null,
): Promise<CotMocInsight | null> {
  if (!(await canViewCotMocInsight(cotMocId, requesterId))) return null;
  const admin = createServiceRoleClient();

  const { data: rows } = await admin
    .from("social_thong_ke_doi_tuong_ngay")
    .select(
      "luot_tiep_can, tiep_can_unique, luot_xem_noi_dung, luot_mo_comment, luot_click_profile, luot_xem_media, luot_click_lien_ket",
    )
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", cotMocId)
    .returns<
      Array<{
        luot_tiep_can: number;
        tiep_can_unique: number;
        luot_xem_noi_dung: number;
        luot_mo_comment: number;
        luot_click_profile: number;
        luot_xem_media: number;
        luot_click_lien_ket: number;
      }>
    >();

  if (!rows || rows.length === 0) return { ...EMPTY_INSIGHT };

  return rows.reduce<CotMocInsight>(
    (acc, r) => ({
      luotTiepCan: acc.luotTiepCan + (r.luot_tiep_can ?? 0),
      tiepCanUnique: acc.tiepCanUnique + (r.tiep_can_unique ?? 0),
      luotXemNoiDung: acc.luotXemNoiDung + (r.luot_xem_noi_dung ?? 0),
      luotMoComment: acc.luotMoComment + (r.luot_mo_comment ?? 0),
      luotClickProfile: acc.luotClickProfile + (r.luot_click_profile ?? 0),
      luotXemMedia: acc.luotXemMedia + (r.luot_xem_media ?? 0),
      luotClickLienKet: acc.luotClickLienKet + (r.luot_click_lien_ket ?? 0),
    }),
    { ...EMPTY_INSIGHT },
  );
}
