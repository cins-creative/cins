/**
 * Hằng số dùng chung (client + server) cho analytics sự kiện social.
 * KHÔNG import server-only ở đây.
 */

export const LOAI_SU_KIEN = [
  "hien_thi",
  "mo_card",
  "xem_binh_luan",
  "mo_popover_nguoi",
  "xem_profile_full",
  "click_lien_ket",
  "xem_media",
] as const;
export type LoaiSuKien = (typeof LOAI_SU_KIEN)[number];
export const LOAI_SU_KIEN_SET: ReadonlySet<string> = new Set(LOAI_SU_KIEN);

export const LOAI_DOI_TUONG_SUKIEN = [
  "cot_moc",
  "tac_pham",
  "du_an",
  "thao_luan",
  "nguoi_dung",
  "to_chuc",
  "org_bai_dang",
] as const;
export type LoaiDoiTuongSuKien = (typeof LOAI_DOI_TUONG_SUKIEN)[number];
export const LOAI_DOI_TUONG_SUKIEN_SET: ReadonlySet<string> = new Set(
  LOAI_DOI_TUONG_SUKIEN,
);

export const NGUON_SU_KIEN = [
  "journey_home",
  "entity_lens",
  "permalink",
  "gallery",
  "org_page",
  "cong_dong",
  "khac",
] as const;
export type NguonSuKien = (typeof NGUON_SU_KIEN)[number];
export const NGUON_SU_KIEN_SET: ReadonlySet<string> = new Set(NGUON_SU_KIEN);

/** Số event tối đa nhận trong 1 request (chống lạm dụng). */
export const MAX_SU_KIEN_BATCH = 50;

export type SuKienInput = {
  loai_su_kien: LoaiSuKien;
  loai_doi_tuong: LoaiDoiTuongSuKien;
  id_doi_tuong: string;
  nguon?: NguonSuKien | null;
  loai_boi_canh?: LoaiDoiTuongSuKien | null;
  id_boi_canh?: string | null;
  ngu_canh?: Record<string, unknown> | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Lọc + chuẩn hoá 1 event thô từ client. Trả null nếu không hợp lệ. */
export function sanitizeSuKien(raw: unknown): SuKienInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!LOAI_SU_KIEN_SET.has(String(r.loai_su_kien))) return null;
  if (!LOAI_DOI_TUONG_SUKIEN_SET.has(String(r.loai_doi_tuong))) return null;
  if (!isUuid(r.id_doi_tuong)) return null;

  const nguon =
    r.nguon && NGUON_SU_KIEN_SET.has(String(r.nguon))
      ? (r.nguon as NguonSuKien)
      : null;
  const loaiBoiCanh =
    r.loai_boi_canh && LOAI_DOI_TUONG_SUKIEN_SET.has(String(r.loai_boi_canh))
      ? (r.loai_boi_canh as LoaiDoiTuongSuKien)
      : null;
  const idBoiCanh = isUuid(r.id_boi_canh) ? (r.id_boi_canh as string) : null;

  let nguCanh: Record<string, unknown> | null = null;
  if (r.ngu_canh && typeof r.ngu_canh === "object" && !Array.isArray(r.ngu_canh)) {
    /* Giới hạn kích thước để tránh nhồi rác. */
    const str = JSON.stringify(r.ngu_canh);
    if (str.length <= 2000) nguCanh = r.ngu_canh as Record<string, unknown>;
  }

  return {
    loai_su_kien: r.loai_su_kien as LoaiSuKien,
    loai_doi_tuong: r.loai_doi_tuong as LoaiDoiTuongSuKien,
    id_doi_tuong: r.id_doi_tuong as string,
    nguon,
    loai_boi_canh: loaiBoiCanh,
    id_boi_canh: idBoiCanh,
    ngu_canh: nguCanh,
  };
}
