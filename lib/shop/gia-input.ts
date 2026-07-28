/**
 * Đọc giá từ ô input của seller. Phải chấp nhận dấu phân cách nghìn kiểu Việt:
 * `Number("40.000")` ra **40**, nên không được parse trực tiếp bằng `Number`.
 * Trả `null` khi trống, không phải số, hoặc âm.
 */
export function parseGiaInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  // 80.000 / 1.200.000 → nghìn VN
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const n = Number.parseInt(cleaned.replace(/\./g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
