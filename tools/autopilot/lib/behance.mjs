import { fetchQuaWorker } from "./fetch-html.mjs";

/**
 * Username Behance từ URL hồ sơ.
 * VD: https://www.behance.net/someone → someone
 */
export function behanceUsernameTuUrl(urlHoSo) {
  let u;
  try {
    u = new URL(String(urlHoSo || "").trim());
  } catch {
    return null;
  }
  if (!/behance\.net$/i.test(u.hostname.replace(/^www\./, ""))) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (!parts.length) return null;
  const reserved = new Set([
    "gallery",
    "search",
    "galleries",
    "joblist",
    "for_you",
    "hire",
    "live",
    "courses",
  ]);
  if (reserved.has(parts[0].toLowerCase())) return null;
  return parts[0].toLowerCase();
}

/**
 * Behance feed hiện bị Cloudflare chặn từ worker (2026-07).
 * Giữ thử RSS; nếu fail → hướng dẫn nhap-muc thủ công.
 */
export async function thuThapBehance(urlHoSo, { gioiHan = 50 } = {}) {
  const username = behanceUsernameTuUrl(urlHoSo);
  if (!username) {
    return {
      ok: false,
      error: "Không đọc được username Behance từ URL.",
      items: [],
    };
  }

  const candidates = [
    `https://www.behance.net/feeds/user?username=${encodeURIComponent(username)}`,
    `https://www.behance.net/${username}/feed`,
  ];

  for (const feedUrl of candidates) {
    const res = await fetchQuaWorker(feedUrl);
    if (res.ok && res.text.includes("<item>")) {
      /* Parser tối giản RSS nếu feed mở lại */
      const items = [];
      const reItem = /<item>([\s\S]*?)<\/item>/gi;
      let m;
      while ((m = reItem.exec(res.text))) {
        const block = m[1];
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
        const urlCanonic = (linkMatch?.[1] || "").trim();
        if (!/^https:\/\//i.test(urlCanonic)) continue;
        items.push({
          urlCanonic: urlCanonic.split("?")[0],
          tieuDeGoc: (titleMatch?.[1] || urlCanonic).trim(),
          moTaGoc: null,
          tenTacGia: username,
          anhBiaUrl: null,
          meta: { nenTang: "behance", username, nguonRss: true },
        });
        if (items.length >= gioiHan) break;
      }
      return { ok: true, items, feedUrl, username };
    }
  }

  return {
    ok: false,
    error:
      "Behance đang chặn fetch (Cloudflare). Thêm mục thủ công: npm run autopilot -- nhap-muc --nen-tang behance --url 'https://www.behance.net/gallery/…' --tieu-de '…' --tac-gia '…'",
    items: [],
    username,
  };
}
