/** Map `nhom` (DB) → class màu rail (mockup huongnghiep-advertising). */

export const RAIL_GROUP_THEMES = [
  "g-design",
  "g-film",
  "g-art",
  "g-arch",
  "g-fashion",
  "g-game",
  "g-music",
  "g-media",
  "g-tech",
] as const;

export type RailGroupTheme = (typeof RAIL_GROUP_THEMES)[number];

export function normalizeNhomHeadingKey(n: string): string {
  return n
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "D")
    .replace(/&/g, " ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Khóa `article_nhom.slug`, `nhom` DB hoặc tiêu đề nhóm → theme rail. */
export function railGroupThemeClass(nhomRaw: string | null): RailGroupTheme {
  let x = normalizeNhomHeadingKey(nhomRaw ?? "");
  x = x.replace(/^NHOM_NGHE_/, "").replace(/^NHOM_NGANH_/, "").replace(/^NN_/, "");

  if (x.includes("GAME") || x.includes("TRO_CHOI")) return "g-game";
  if (x.includes("AM_NHAC") || x.includes("MUSIC") || x.includes("NHAC")) return "g-music";
  if (x.includes("THOI_TRANG") || x.includes("FASHION")) return "g-fashion";

  if (
    x.includes("KIEN_TRUC") ||
    x.includes("KHONG_GIAN") ||
    x.includes("QUY_HOACH") ||
    x.includes("NOI_THAT") ||
    x === "SPATIAL" ||
    x.startsWith("SPATIAL_")
  ) {
    return "g-arch";
  }

  if (
    x.includes("PHIM") ||
    x.includes("DIEN_ANH") ||
    x.includes("HOAT_HINH") ||
    x.includes("FILM") ||
    x.includes("ANIMATION") ||
    x.includes("BAO_CHI") ||
    x.includes("TRUYEN_HINH")
  ) {
    return "g-film";
  }

  if (
    x.includes("TRUYEN_THONG") ||
    x.includes("JOURNALISM") ||
    x.includes("MEDIA") ||
    x.includes("PR_") ||
    x.endsWith("_PR")
  ) {
    return "g-media";
  }

  /* Mỹ thuật, hội họa — trước nhánh thiết kế thuần */
  if (
    x.includes("MY_THUAT") ||
    x.includes("HOI_HOA") ||
    x.includes("DIEU_KHAC") ||
    x.includes("SON_MAI") ||
    x.includes("ILLUSTRATION") ||
    x === "ART" ||
    x.startsWith("ART_")
  ) {
    return "g-art";
  }

  if (
    x.includes("DO_HOA") ||
    x.includes("CONG_NGHIEP") ||
    x.includes("THIET_KE") ||
    x.includes("DESIGN") ||
    x.includes("MULTIMEDIA") ||
    x.includes("DA_PHUONG_TIEN")
  ) {
    return "g-design";
  }

  if (
    x.includes("CNTT") ||
    x.includes("CONG_NGHE") ||
    x.includes("KY_THUAT") ||
    x.includes("TECH") ||
    x.includes("PHAN_MEM") ||
    x.includes("IT_")
  ) {
    return "g-tech";
  }

  return "g-tech";
}

const DEPT_CARD_THEMES = [
  "strategy",
  "production",
  "creative",
  "digital",
  "research",
] as const;

export type DeptCardTheme = (typeof DEPT_CARD_THEMES)[number];

export function deptCardThemeByIndex(index: number): DeptCardTheme {
  return DEPT_CARD_THEMES[index % DEPT_CARD_THEMES.length];
}
