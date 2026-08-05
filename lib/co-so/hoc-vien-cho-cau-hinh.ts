/**
 * Cấu hình tab "Chờ xử lý" — lưu trong `org_to_chuc.cau_hinh`
 * (không ALTER cột). Key: `hoc_vien_cho_ttl_ngay`.
 *
 * - `null` / thiếu → mặc định 14 ngày
 * - `0` → tắt tự gỡ
 * - `1…365` → số ngày sau `ngay_dang_ky` thì lazy-purge
 */

export const HOC_VIEN_CHO_TTL_DEFAULT = 14;
export const HOC_VIEN_CHO_TTL_MAX = 365;
export const HOC_VIEN_CHO_CAU_HINH_KEY = "hoc_vien_cho_ttl_ngay";

export function parseHocVienChoTtlNgay(cauHinh: unknown): number {
  if (!cauHinh || typeof cauHinh !== "object" || Array.isArray(cauHinh)) {
    return HOC_VIEN_CHO_TTL_DEFAULT;
  }
  const raw = (cauHinh as Record<string, unknown>)[HOC_VIEN_CHO_CAU_HINH_KEY];
  if (raw === undefined || raw === null) return HOC_VIEN_CHO_TTL_DEFAULT;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return HOC_VIEN_CHO_TTL_DEFAULT;
  return Math.min(Math.floor(n), HOC_VIEN_CHO_TTL_MAX);
}

export function mergeHocVienChoTtlNgay(
  existing: unknown,
  ttlNgay: number,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const n = Math.min(
    Math.max(0, Math.floor(ttlNgay)),
    HOC_VIEN_CHO_TTL_MAX,
  );
  return {
    ...base,
    [HOC_VIEN_CHO_CAU_HINH_KEY]: n,
  };
}
