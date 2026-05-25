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

/** Các trường tên hiển thị / chính thức của trường. */
export function truongListingNameHaystack(school: TruongListItem): string {
  return [
    school.ten,
    school.ten_chinh_thuc,
    school.ten_tieng_anh,
    school.slug.replace(/-/g, " "),
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
