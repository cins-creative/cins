/**
 * 10 nick seeding — phân kênh:
 *   3 ArtStation · 3 Behance · 3 Pixiv · 1 truyện tranh
 */

export type KenhNguon = "artstation" | "behance" | "pixiv" | "truyen";

export type NickSeedDef = {
  slug: string;
  kenh: KenhNguon;
  niche: string[];
  ghiChu: string;
  dangBat?: boolean;
};

export const NICK_SEED: NickSeedDef[] = [
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
    slug: "itachihung",
    kenh: "pixiv",
    niche: ["3d-character", "dark", "ninja", "illustration"],
    ghiChu: "Pixiv · illustration / dark character",
  },
  {
    slug: "mikungoc",
    kenh: "pixiv",
    niche: ["chibi", "teach", "anime-kids"],
    ghiChu: "Pixiv · chibi / anime kids",
  },
  {
    slug: "nezukochi",
    kenh: "pixiv",
    niche: ["webtoon", "color", "warm-palette", "illustration"],
    ghiChu: "Pixiv · color / warm illustration",
  },
  {
    slug: "zorobao",
    kenh: "truyen",
    niche: ["manga", "storyboard", "black-white"],
    ghiChu: "Truyện · manga B&W (chờ brief nguồn)",
    dangBat: false,
  },
];

export function nicheVoiKenh(nick: NickSeedDef): string[] {
  const tag = `nguon:${nick.kenh}`;
  const base = (nick.niche || []).filter((t) => !String(t).startsWith("nguon:"));
  return [tag, ...base];
}

export function kenhTuNiche(nicheArr: string[] | null | undefined): KenhNguon | null {
  for (const t of nicheArr || []) {
    const m = String(t).match(/^nguon:(artstation|behance|pixiv|truyen)$/);
    if (m) return m[1] as KenhNguon;
  }
  return null;
}
