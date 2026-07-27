/**
 * Pixiv — server-side ajax thường 403 (giống Behance).
 * Cách chính: Chrome extension extensions/cins-pixiv-import
 * hoặc nhap-muc thủ công.
 */

export function pixivUserIdTuUrl(urlHoSo) {
  try {
    const u = new URL(String(urlHoSo || "").trim());
    if (!/pixiv\.net$/i.test(u.hostname.replace(/^www\./, ""))) return null;
    const m = u.pathname.match(/\/(?:en\/)?users\/(\d+)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function pixivArtworkUrl(id) {
  return `https://www.pixiv.net/artworks/${id}`;
}

/**
 * @returns {Promise<{ ok: true, items: Array } | { ok: false, error: string }>}
 */
export async function thuThapPixiv(urlHoSo, { gioiHan = 30 } = {}) {
  const id = pixivUserIdTuUrl(urlHoSo);
  if (!id) {
    return {
      ok: false,
      error: "URL Pixiv không hợp lệ (cần /users/{id}).",
    };
  }
  void gioiHan;
  return {
    ok: false,
    error:
      "Pixiv server-side bị chặn (403). Dùng extension cins-pixiv-import hoặc nhap-muc.",
  };
}
