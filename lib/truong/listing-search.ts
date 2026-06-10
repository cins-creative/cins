import type { TruongListItem } from "@/lib/truong/types";

/** Chuỗi tìm kiếm — bỏ dấu, gộp khoảng trắng. */
export function normalizeTruongSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

/** Viết tắt trong ngoặc — VD «(HUTECH)» → thêm «HUTECH» vào haystack. */
function parentheticalAliases(...parts: (string | null | undefined)[]): string {
  const out: string[] = [];
  for (const part of parts) {
    if (!part?.trim()) continue;
    for (const match of part.matchAll(/\(([^)]+)\)/g)) {
      const alias = match[1]?.trim();
      if (alias) out.push(alias);
    }
  }
  return out.join(" ");
}

/** Các trường tên hiển thị / chính thức của trường. */
export function truongListingNameHaystack(school: TruongListItem): string {
  return [
    school.ten,
    school.ten_chinh_thuc,
    school.ten_tieng_anh,
    school.ma_truong,
    school.slug.replace(/-/g, " "),
    parentheticalAliases(
      school.ten,
      school.ten_chinh_thuc,
      school.ten_tieng_anh,
    ),
  ]
    .filter((part) => part && part.trim())
    .join(" ");
}

export function truongMatchesNameSearch(
  school: TruongListItem,
  query: string,
): boolean {
  const q = normalizeTruongSearchText(query);
  if (!q) return true;
  const hay = normalizeTruongSearchText(truongListingNameHaystack(school));
  return hay.includes(q);
}
