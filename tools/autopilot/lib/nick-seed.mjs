/**
 * 10 nick seeding — phân kênh nguồn:
 *   4 ArtStation · 4 Behance · 2 truyện tranh (brief sau → dang_bat false)
 * Đồng bộ niche tag `nguon:artstation|behance|truyen` để router chuan-bi-dang.
 */

/** @typedef {'artstation'|'behance'|'truyen'} KenhNguon */

/** @type {Array<{
 *   slug: string,
 *   kenh: KenhNguon,
 *   niche: string[],
 *   ghiChu: string,
 *   dangBat?: boolean,
 * }>} */
export const NICK_SEED = [
  /* —— 4 ArtStation —— */
  {
    slug: "kiritominh",
    kenh: "artstation",
    niche: ["fantasy", "character", "isekai", "rigging"],
    ghiChu: "ArtStation · fantasy character / isekai",
  },
  {
    slug: "hinatavy",
    kenh: "artstation",
    niche: ["digital-paint", "slice-of-life", "lighting"],
    ghiChu: "ArtStation · digital paint / SoL",
  },
  {
    slug: "levikhoa",
    kenh: "artstation",
    niche: ["weapon", "armor", "concept", "silhouette"],
    ghiChu: "ArtStation · weapon / armor concept",
  },
  {
    slug: "itachihung",
    kenh: "artstation",
    niche: ["3d-character", "dark", "ninja", "mobile-game"],
    ghiChu: "ArtStation · 3D character / dark",
  },
  /* —— 4 Behance —— */
  {
    slug: "yukitrang",
    kenh: "behance",
    niche: ["2d-animation", "cut-out", "frame-by-frame"],
    ghiChu: "Behance · 2D animation",
  },
  {
    slug: "sakuralinh",
    kenh: "behance",
    niche: ["fanart", "ln-cover", "pastel", "commission"],
    ghiChu: "Behance · fanart / LN cover",
  },
  {
    slug: "remnhi",
    kenh: "behance",
    niche: ["character-design", "portfolio"],
    ghiChu: "Behance · character design / portfolio",
  },
  {
    slug: "mikungoc",
    kenh: "behance",
    niche: ["chibi", "teach", "anime-kids"],
    ghiChu: "Behance · chibi / teach anime",
  },
  /* —— 2 truyện tranh — chờ brief —— */
  {
    slug: "zorobao",
    kenh: "truyen",
    niche: ["manga", "storyboard", "black-white"],
    ghiChu: "Truyện · manga B&W (chờ brief — tạm tắt Autopilot)",
    dangBat: false,
  },
  {
    slug: "nezukochi",
    kenh: "truyen",
    niche: ["webtoon", "color", "warm-palette"],
    ghiChu: "Truyện · webtoon color (chờ brief — tạm tắt Autopilot)",
    dangBat: false,
  },
];

/** Tag niche đánh dấu kênh — dùng khi upsert + match. */
export function nicheVoiKenh(nick) {
  const tag = `nguon:${nick.kenh}`;
  const base = (nick.niche || []).filter((t) => !String(t).startsWith("nguon:"));
  return [tag, ...base];
}

export function kenhTuNiche(nicheArr) {
  for (const t of nicheArr || []) {
    const m = String(t).match(/^nguon:(artstation|behance|truyen)$/);
    if (m) return m[1];
  }
  return null;
}
