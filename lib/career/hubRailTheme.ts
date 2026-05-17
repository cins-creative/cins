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
    .replace(/[\s-]+/g, "_");
}

/** Khóa `nhom` gốc hoặc tiêu đề hiển thị → theme rail. */
export function railGroupThemeClass(nhomRaw: string | null): RailGroupTheme {
  let x = normalizeNhomHeadingKey(nhomRaw ?? "");
  x = x.replace(/^NHOM_NGHE_/, "");

  if (x === "DESIGN" || x.startsWith("DESIGN_") || x.includes("DESIGN")) return "g-design";
  if (
    x === "FILM" ||
    x === "FILM_ANIMATION" ||
    x.startsWith("FILM_") ||
    x.includes("FILM") ||
    x.includes("ANIMATION") ||
    x.includes("HOAT_HINH")
  )
    return "g-film";
  if (
    x === "ILLUSTRATION" ||
    x === "ILLUSTRATION_ART" ||
    x.startsWith("ILLUSTRATION_") ||
    x.includes("ILLUSTRATION")
  )
    return "g-art";
  if (x === "SPATIAL" || x.startsWith("SPATIAL_") || x.includes("SPATIAL")) return "g-arch";
  if (x === "FASHION" || x.startsWith("FASHION_") || x.includes("FASHION")) return "g-fashion";
  if (x.includes("GAME")) return "g-game";
  if (x.includes("MUSIC") || x.includes("AM_NHAC")) return "g-music";
  if (x.includes("MEDIA") || x.includes("TRUYEN")) return "g-media";
  if (
    x.includes("MY_THUAT_THIET_KE") ||
    x.includes("THIET_KE") ||
    x.includes("MY_THUAT_THUAN")
  )
    return "g-design";
  if (x.includes("KIEN_TRUC") || x.includes("KHONG_GIAN")) return "g-arch";
  if (x.includes("BAO_CHI") || x.includes("PHIM")) return "g-film";
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
