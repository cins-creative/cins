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

const SEARCH_HANDLE_RE = /@([A-Za-z0-9._-]+)/g;

export type ParsedSearchQuery = {
  /** Phần tên/cụm — đã gỡ @handle. */
  nameQuery: string;
  /** Handle không gồm `@` (vd. nguyenthanhtu). */
  handles: string[];
};

/**
 * Tách `@slug` khỏi cụm tên: `@nguyenthanhtu` → handle;
 * `Nguyễn Thanh Tú @nguyenthanhtu` → tên + handle.
 */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  if (!trimmed) return { nameQuery: "", handles: [] };

  const handles: string[] = [];
  const nameQuery = trimmed
    .replace(SEARCH_HANDLE_RE, (_full, handle: string) => {
      if (handle) handles.push(handle);
      return " ";
    })
    .replace(/^@+/, "")
    .replace(/\s+/g, " ")
    .trim();

  return { nameQuery, handles: [...new Set(handles)] };
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
