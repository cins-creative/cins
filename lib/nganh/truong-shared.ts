/** Helpers + types cho trường đào tạo — an toàn import từ Client Components. */

export type NganhTruongRow = {
  /** `org_truong_nganh.id` — dùng khi gỡ liên kết. */
  programId: string;
  /** `org_to_chuc.id` */
  id: string;
  slug: string;
  ten: string;
  logo_id: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  /** URL Cloudflare đã resolve (server). */
  avatar_src?: string | null;
  cover_src?: string | null;
  tinh_thanh: string | null;
  /** Tên ngành đang tuyển tại trường (tối đa 3 hiển thị trên card). */
  nganhTags: string[];
  /** Tổng số ngành `dang_tuyen` tại trường (không chỉ ngành hiện tại). */
  nganhCount: number;
  he_dao_tao: string | null;
  thoi_gian_thang: number | null;
  ma_truong: string | null;
  loai_truong: string | null;
  website: string | null;
};

export function labelLoaiTruong(code: string | null | undefined): string {
  const c = (code ?? "").trim().toLowerCase();
  if (!c) return "—";
  if (c === "cong_lap" || c.includes("cong_lap") || c.includes("công lập"))
    return "Công lập";
  if (c === "dan_lap" || c.includes("dan_lap") || c.includes("dân lập"))
    return "Dân lập";
  if (c.includes("quoc_te") || c.includes("quốc tế")) return "Quốc tế";
  return c.replace(/_/g, " ");
}

export function labelHeDaoTao(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "—";
  const lower = c.toLowerCase();
  if (lower === "dai_hoc" || lower === "dai hoc") return "Đại học";
  if (lower === "cao_dang") return "Cao đẳng";
  if (lower === "chinh_quy") return "Chính quy";
  if (lower === "lien_thong") return "Liên thông";
  if (lower === "vua_hoc_vua_lam" || lower === "vua_lam_vua_hoc")
    return "Vừa học vừa làm";
  if (lower === "xa_hoc" || lower === "hoc_xa") return "Học xa";
  return c.replace(/_/g, " ");
}

export function formatThoiGianThang(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return "—";
  const m = Math.round(months);
  if (m >= 12 && m % 12 === 0) {
    const years = m / 12;
    return `${years} năm`;
  }
  return `${m} tháng`;
}

export function truongDetailHref(slug: string): string {
  return `/truong-dai-hoc/${encodeURIComponent(slug)}`;
}

export function countUniqueTruong(rows: NganhTruongRow[]): number {
  return new Set(rows.map((r) => r.id)).size;
}

export function uniqueTruongByOrg(rows: NganhTruongRow[]): NganhTruongRow[] {
  const seen = new Map<string, NganhTruongRow>();
  for (const row of rows) {
    if (!seen.has(row.id)) seen.set(row.id, row);
  }
  return [...seen.values()];
}

export function truongSidebarMeta(row: NganhTruongRow): string {
  const parts: string[] = [];
  const loai = labelLoaiTruong(row.loai_truong);
  if (loai !== "—") parts.push(loai);
  if (row.ma_truong) parts.push(`Mã trường ${row.ma_truong}`);
  return parts.join(" · ") || "Trường đại học";
}
