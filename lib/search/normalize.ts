/** Chuỗi tìm kiếm — bỏ dấu, gộp khoảng trắng (khớp listing trường). */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token ≥2 ký tự + cả chuỗi gốc (nếu khác token rời). */
export function searchQueryTokens(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter((t) => t.length >= 2);
  const out = new Set<string>([trimmed, ...tokens]);
  if (trimmed.length === 1) out.add(trimmed);
  return [...out];
}
