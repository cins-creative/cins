import { escapeIlikePattern } from "@/lib/search/helpers";
import { normalizeSearchText, searchQueryTokens } from "@/lib/search/normalize";

/** OR nhiều cột × nhiều token — mở rộng recall, rank sau bằng score. */
export function buildSupabaseOrIlike(columns: readonly string[], query: string): string {
  const tokens = searchQueryTokens(query);
  const parts: string[] = [];

  for (const col of columns) {
    for (const token of tokens) {
      const safe = escapeIlikePattern(token);
      parts.push(`${col}.ilike.%${safe}%`);

      const ascii = normalizeSearchText(token);
      if (ascii && ascii !== token.toLowerCase()) {
        parts.push(`${col}.ilike.%${escapeIlikePattern(ascii)}%`);
      }
    }
  }

  return parts.join(",");
}
