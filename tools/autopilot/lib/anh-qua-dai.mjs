/** Đồng bộ ngưỡng với lib/autopilot/anh-qua-dai.ts */

export const TY_LE_CAO_FEED_TOI_DA = 3;
export const CHIEU_CAO_FEED_TOI_DA = 3500;

export function anhQuaDaiChoFeed({ width, height } = {}) {
  const w = width;
  const h = height;
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

/**
 * Parse size_* width/height từ HTML gallery Behance.
 * @returns {{ width: number, height: number }[]}
 */
export function layKichThuocAnhTuHtmlBehance(html) {
  const decoded = String(html || "")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/");
  const out = [];
  const re =
    /"size_[^"]+"\s*:\s*\{[^}]*?"width"\s*:\s*(\d+)[^}]*?"height"\s*:\s*(\d+)/gi;
  let m;
  while ((m = re.exec(decoded))) {
    const width = Number(m[1]);
    const height = Number(m[2]);
    if (width > 0 && height > 0) out.push({ width, height });
  }
  const re2 =
    /"size_[^"]+"\s*:\s*\{[^}]*?"height"\s*:\s*(\d+)[^}]*?"width"\s*:\s*(\d+)/gi;
  while ((m = re2.exec(decoded))) {
    const height = Number(m[1]);
    const width = Number(m[2]);
    if (width > 0 && height > 0) out.push({ width, height });
  }
  return out;
}

export function htmlBehanceCoAnhQuaDai(html) {
  return layKichThuocAnhTuHtmlBehance(html).some((a) => anhQuaDaiChoFeed(a));
}

/** @deprecated Behance dài nhúng video — không còn dùng để reject Autopilot. */
export function htmlBehanceCoVideo(html) {
  const h = String(html || "");
  if (!h) return false;
  if (/VideoModule/i.test(h)) return true;
  if (/__typename"\s*:\s*"Video/i.test(h)) return true;
  if (/player\.vimeo\.com|vimeo\.com\/(?:video\/)?\d+/i.test(h)) return true;
  if (/youtube\.com\/(?:embed|watch)|youtu\.be\//i.test(h)) return true;
  return false;
}
