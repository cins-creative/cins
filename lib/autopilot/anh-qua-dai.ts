/**
 * Ảnh strip / sheet quá cao — trên feed Journey gần như không đọc được.
 * Dùng khi lọc Autopilot (Behance/ArtStation), không áp cho upload tay thông thường.
 */

/** height/width ≥ ngưỡng → quá dài. Poster sheet Anime ≈ 3.73; icon dump ≈ 5.58. */
export const TY_LE_CAO_FEED_TOI_DA = 3;

/** Chiều cao tuyệt đối (px) — sheet / collage dọc nuốt feed. */
export const CHIEU_CAO_FEED_TOI_DA = 3500;

export function anhQuaDaiChoFeed(opts: {
  width?: number | null;
  height?: number | null;
}): boolean {
  const w = opts.width;
  const h = opts.height;
  if (
    typeof w !== "number" ||
    typeof h !== "number" ||
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w <= 0 ||
    h <= 0
  ) {
    return false;
  }
  if (h >= CHIEU_CAO_FEED_TOI_DA) return true;
  return h / w >= TY_LE_CAO_FEED_TOI_DA;
}

export function coAnhQuaDaiTrongDanhSach(
  anh: ReadonlyArray<{ width?: number | null; height?: number | null }>,
): boolean {
  return anh.some((a) => anhQuaDaiChoFeed(a));
}

/**
 * Project Behance có video (Vimeo/YouTube/EmbedModule).
 * @deprecated Behance dài nhúng video vào bài — không còn dùng để reject Autopilot.
 */
export function htmlBehanceCoVideo(html: string): boolean {
  const h = String(html || "");
  if (!h) return false;
  if (/VideoModule|EmbedModule/i.test(h)) return true;
  if (/__typename"\s*:\s*"Video/i.test(h)) return true;
  if (/player\.vimeo\.com|vimeo\.com\/(?:video\/)?\d+/i.test(h)) return true;
  if (/youtube\.com\/(?:embed|watch)|youtu\.be\//i.test(h)) return true;
  return false;
}
