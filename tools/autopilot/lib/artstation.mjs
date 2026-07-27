import { fetchQuaWorker } from "./fetch-html.mjs";

/**
 * Lấy username ArtStation từ URL hồ sơ.
 * VD: https://www.artstation.com/wlop → wlop
 */
export function artstationUsernameTuUrl(urlHoSo) {
  let u;
  try {
    u = new URL(String(urlHoSo || "").trim());
  } catch {
    return null;
  }
  if (!/artstation\.com$/i.test(u.hostname.replace(/^www\./, ""))) {
    /* subdomain artist.artstation.com */
    const host = u.hostname.toLowerCase();
    const m = host.match(/^([a-z0-9_-]+)\.artstation\.com$/);
    if (m && m[1] !== "www" && m[1] !== "cdna" && m[1] !== "api") {
      return m[1];
    }
    return null;
  }
  const parts = u.pathname.split("/").filter(Boolean);
  if (!parts.length) return null;
  if (parts[0] === "users" && parts[1]) return parts[1].toLowerCase();
  const reserved = new Set([
    "artwork",
    "projects",
    "search",
    "blogs",
    "marketplace",
    "learning",
    "jobs",
    "challenges",
  ]);
  if (reserved.has(parts[0].toLowerCase())) return null;
  return parts[0].toLowerCase();
}

export function artstationRssUrl(username) {
  const u = String(username || "")
    .trim()
    .toLowerCase();
  if (!u) throw new Error("Thiếu username ArtStation");
  return `https://www.artstation.com/${u}.rss`;
}

function stripCdata(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function layThe(xml, tag) {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );
  const m = xml.match(re);
  return m ? stripCdata(m[1]) : "";
}

function layAnhDau(html) {
  const m = String(html || "").match(
    /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i,
  );
  return m ? decodeEntities(m[1]) : null;
}

function tachTieuDeVaTacGia(titleRaw) {
  const title = decodeEntities(stripCdata(titleRaw)).trim();
  const m = title.match(/^(.*)\s+by\s+(.+)$/i);
  if (m) {
    return { tieuDe: m[1].trim(), tenTacGia: m[2].trim() };
  }
  return { tieuDe: title, tenTacGia: null };
}

/**
 * Parse RSS ArtStation → danh sách mục.
 * @returns {Array<{ urlCanonic: string, tieuDeGoc: string, moTaGoc: string|null, tenTacGia: string|null, anhBiaUrl: string|null, meta: object }>}
 */
export function parseArtstationRss(xml, { username } = {}) {
  const items = [];
  const reItem = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = reItem.exec(xml))) {
    const block = m[1];
    const link = decodeEntities(layThe(block, "link")).trim();
    const guid = decodeEntities(layThe(block, "guid")).trim();
    const urlCanonic = link || guid;
    if (!urlCanonic || !/^https:\/\//i.test(urlCanonic)) continue;

    const { tieuDe, tenTacGia } = tachTieuDeVaTacGia(layThe(block, "title"));
    const content =
      layThe(block, "content:encoded") || layThe(block, "description");
    const anhBiaUrl = layAnhDau(content);
    const pubDate = layThe(block, "pubDate") || null;

    items.push({
      urlCanonic: urlCanonic.split("?")[0],
      tieuDeGoc: tieuDe || urlCanonic,
      moTaGoc: null,
      tenTacGia: tenTacGia || username || null,
      anhBiaUrl,
      meta: {
        nenTang: "artstation",
        pubDate,
        username: username || null,
        nguonRss: true,
      },
    });
  }
  return items;
}

/**
 * Thu thập projects từ hồ sơ ArtStation (RSS qua worker).
 */
export async function thuThapArtstation(urlHoSo, { gioiHan = 50 } = {}) {
  const username =
    artstationUsernameTuUrl(urlHoSo) ||
    String(urlHoSo || "")
      .trim()
      .toLowerCase();
  if (!username) {
    return { ok: false, error: "Không đọc được username ArtStation từ URL.", items: [] };
  }

  const rssUrl = artstationRssUrl(username);
  const res = await fetchQuaWorker(rssUrl);
  if (!res.ok) {
    return {
      ok: false,
      error: `ArtStation RSS lỗi: ${res.error || res.status}`,
      items: [],
      rssUrl,
    };
  }
  if (!res.text.includes("<item>")) {
    return {
      ok: false,
      error: "RSS không có <item> — username sai hoặc feed trống.",
      items: [],
      rssUrl,
    };
  }

  let items = parseArtstationRss(res.text, { username });
  if (gioiHan > 0) items = items.slice(0, gioiHan);
  return { ok: true, items, rssUrl, username };
}
