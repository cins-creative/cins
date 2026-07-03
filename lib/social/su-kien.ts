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

/**
 * Đếm số lần 1 viewer đã "tiếp cận" (`hien_thi`) từng đối tượng trong danh sách.
 * Dùng để xếp hạng feed: đối tượng CHƯA xem (không có trong map ⇒ 0) hoặc xem
 * ít lên trên. Match theo `id_doi_tuong` (UUID toàn cục duy nhất) nên không cần
 * lọc thêm `loai_doi_tuong`. Trả map rỗng cho khách (không `viewerId`).
 */
export async function demLuotXemCuaViewer(
  viewerId: string | null | undefined,
  idDoiTuongs: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!viewerId) return counts;

  const ids = [...new Set(idDoiTuongs.filter(Boolean))];
  if (ids.length === 0) return counts;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("social_luot_xem")
    .select("id_doi_tuong")
    .eq("nguoi_xem", viewerId)
    .eq("loai_su_kien", "hien_thi")
    .in("id_doi_tuong", ids)
    .limit(5000)
    .returns<Array<{ id_doi_tuong: string }>>();

  for (const row of data ?? []) {
    counts.set(row.id_doi_tuong, (counts.get(row.id_doi_tuong) ?? 0) + 1);
  }
  return counts;
}

/* ── Insight RIÊNG TƯ cho chủ bài ────────────────────────────────────── */

/** Nguồn bề mặt được xem là "trong trang tổ chức" (entity-lens / org page). */
const NGUON_TRONG_TO_CHUC: ReadonlySet<string> = new Set(["entity_lens", "org_page"]);

export type NguonBreakdownItem = { nguon: string; luot: number; nguoi: number };
export type GiaiDoanBreakdownItem = { giaiDoan: string; nguoi: number };

export type CotMocInsight = {
  luotTiepCan: number;
  tiepCanUnique: number;
  luotXemNoiDung: number;
  luotMoComment: number;
  luotClickProfile: number;
  luotXemMedia: number;
  luotClickLienKet: number;
  /** Tách lượt tiếp cận: trong trang tổ chức vs bên ngoài (theo người duy nhất). */
  tiepCanTrongToChuc: number;
  tiepCanBenNgoai: number;
  /** Chi tiết theo từng nguồn (luot = impression, nguoi = người/phiên duy nhất). */
  nguonBreakdown: NguonBreakdownItem[];
  /** Phân loại người xem duy nhất theo `giai_doan` (khách → 'khach'). */
  giaiDoanBreakdown: GiaiDoanBreakdownItem[];
};

const EMPTY_INSIGHT: CotMocInsight = {
  luotTiepCan: 0,
  tiepCanUnique: 0,
  luotXemNoiDung: 0,
  luotMoComment: 0,
  luotClickProfile: 0,
  luotXemMedia: 0,
  luotClickLienKet: 0,
  tiepCanTrongToChuc: 0,
  tiepCanBenNgoai: 0,
  nguonBreakdown: [],
  giaiDoanBreakdown: [],
};

/**
 * Kiểm tra requester có quyền xem số liệu của 1 cột mốc không.
 * Bài gắn thẻ = "bài chung của mọi người được gắn" → ai cũng xem được số liệu
 * chung. Cụ thể, cho phép nếu requester là MỘT trong:
 *   1. Tác giả gốc (`content_cot_moc.id_nguoi_dung`) — kể cả khi bài đã được
 *      tổ chức xác thực (`id_to_chuc` set).
 *   2. Đồng tác giả / người được gắn đã chấp nhận (`content_tac_pham_tac_gia`
 *      `trang_thai = accepted`) trên tác phẩm liên kết của cột mốc.
 *   3. Quản trị viên tổ chức (vai trò `owner`/`admin`, active) — chỉ khi bài
 *      thuộc tổ chức (`id_to_chuc`).
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

  /* (1) Tác giả gốc — ưu tiên, không phụ thuộc tổ chức. */
  if (moc.id_nguoi_dung === requesterId) return true;

  /* (2) Người được gắn (đồng tác giả accepted) trên tác phẩm của cột mốc. */
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham")
    .eq("id_cot_moc", cotMocId);
  const tacPhamIds = (links ?? [])
    .map((l) => (l as { id_tac_pham: string }).id_tac_pham)
    .filter(Boolean);
  if (tacPhamIds.length > 0) {
    const { data: coAuthor } = await admin
      .from("content_tac_pham_tac_gia")
      .select("id_nguoi_dung")
      .in("id_tac_pham", tacPhamIds)
      .eq("id_nguoi_dung", requesterId)
      .eq("trang_thai", "accepted")
      .maybeSingle<{ id_nguoi_dung: string }>();
    if (coAuthor) return true;
  }

  /* (3) Quản trị viên tổ chức sở hữu bài. */
  if (moc.id_to_chuc) {
    const { data: membership } = await admin
      .from("user_thanh_vien_to_chuc")
      .select("vai_tro")
      .eq("id_to_chuc", moc.id_to_chuc)
      .eq("id_nguoi_dung", requesterId)
      .eq("trang_thai", "active")
      .in("vai_tro", ["owner", "admin"])
      .maybeSingle<{ vai_tro: string }>();
    if (membership) return true;
  }

  return false;
}

/**
 * Đọc số liệu của 1 cột mốc — REAL-TIME từ log thô (qua RPC service role),
 * gồm tổng chỉ số + tách nguồn (trong tổ chức / bên ngoài) + phân loại người
 * xem theo `giai_doan`. CHỈ người có quyền (`canViewCotMocInsight`). Trả null
 * nếu không đủ quyền (phản-vanity).
 */
export async function getCotMocInsight(
  cotMocId: string,
  requesterId: string | null,
): Promise<CotMocInsight | null> {
  if (!(await canViewCotMocInsight(cotMocId, requesterId))) return null;
  return readSubjectInsight("cot_moc", cotMocId);
}

/**
 * Kiểm tra quyền xem số liệu bài đăng tổ chức (`org_bai_dang`).
 * Chỉ quản trị viên tổ chức (vai trò `owner`/`admin`, active).
 */
export async function canViewOrgBaiDangInsight(
  baiDangId: string,
  requesterId: string | null,
): Promise<boolean> {
  if (!requesterId) return false;
  const admin = createServiceRoleClient();

  const { data: post } = await admin
    .from("org_bai_dang")
    .select("id, id_to_chuc")
    .eq("id", baiDangId)
    .maybeSingle<{ id: string; id_to_chuc: string | null }>();
  if (!post?.id_to_chuc) return false;

  const { data: membership } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", post.id_to_chuc)
    .eq("id_nguoi_dung", requesterId)
    .eq("trang_thai", "active")
    .in("vai_tro", ["owner", "admin"])
    .maybeSingle<{ vai_tro: string }>();
  return Boolean(membership);
}

/**
 * Đọc số liệu bài đăng tổ chức — REAL-TIME. Chỉ quản trị viên tổ chức.
 * Trả null nếu không đủ quyền (phản-vanity).
 */
export async function getOrgBaiDangInsight(
  baiDangId: string,
  requesterId: string | null,
): Promise<CotMocInsight | null> {
  if (!(await canViewOrgBaiDangInsight(baiDangId, requesterId))) return null;
  return readSubjectInsight("org_bai_dang", baiDangId);
}

/** Đọc tổng hợp số liệu của 1 đối tượng từ log thô (không kiểm tra quyền). */
async function readSubjectInsight(
  loai: "cot_moc" | "org_bai_dang",
  id: string,
): Promise<CotMocInsight> {
  const admin = createServiceRoleClient();

  const [totalRes, nguonRes, giaiDoanRes] = await Promise.all([
    admin.rpc("social_insight_doi_tuong", { p_loai: loai, p_id: id }),
    admin.rpc("social_insight_nguon", { p_loai: loai, p_id: id }),
    admin.rpc("social_insight_giai_doan", { p_loai: loai, p_id: id }),
  ]);

  const total = (Array.isArray(totalRes.data) ? totalRes.data[0] : null) as
    | {
        luot_tiep_can: number;
        tiep_can_unique: number;
        luot_xem_noi_dung: number;
        luot_mo_comment: number;
        luot_click_profile: number;
        luot_xem_media: number;
        luot_click_lien_ket: number;
      }
    | null
    | undefined;

  const nguonRows = (Array.isArray(nguonRes.data) ? nguonRes.data : []) as Array<{
    nguon: string;
    luot: number | string;
    nguoi: number | string;
  }>;
  const giaiDoanRows = (
    Array.isArray(giaiDoanRes.data) ? giaiDoanRes.data : []
  ) as Array<{ giai_doan: string; nguoi: number | string }>;

  const nguonBreakdown: NguonBreakdownItem[] = nguonRows
    .map((r) => ({
      nguon: r.nguon,
      luot: Number(r.luot) || 0,
      nguoi: Number(r.nguoi) || 0,
    }))
    .sort((a, b) => b.luot - a.luot);

  let tiepCanTrongToChuc = 0;
  let tiepCanBenNgoai = 0;
  for (const r of nguonBreakdown) {
    if (NGUON_TRONG_TO_CHUC.has(r.nguon)) tiepCanTrongToChuc += r.nguoi;
    else tiepCanBenNgoai += r.nguoi;
  }

  const giaiDoanBreakdown: GiaiDoanBreakdownItem[] = giaiDoanRows
    .map((r) => ({ giaiDoan: r.giai_doan, nguoi: Number(r.nguoi) || 0 }))
    .sort((a, b) => b.nguoi - a.nguoi);

  return {
    luotTiepCan: Number(total?.luot_tiep_can) || 0,
    tiepCanUnique: Number(total?.tiep_can_unique) || 0,
    luotXemNoiDung: Number(total?.luot_xem_noi_dung) || 0,
    luotMoComment: Number(total?.luot_mo_comment) || 0,
    luotClickProfile: Number(total?.luot_click_profile) || 0,
    luotXemMedia: Number(total?.luot_xem_media) || 0,
    luotClickLienKet: Number(total?.luot_click_lien_ket) || 0,
    tiepCanTrongToChuc,
    tiepCanBenNgoai,
    nguonBreakdown,
    giaiDoanBreakdown,
  };
}
