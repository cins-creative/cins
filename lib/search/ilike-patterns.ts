import { escapeIlikePattern } from "@/lib/search/helpers";
import { searchQueryTokens } from "@/lib/search/normalize";

/** OR nhiều cột × nhiều token — mở rộng recall, rank sau bằng score. */
export function buildSupabaseOrIlike(columns: readonly string[], query: string): string {
  const tokens = searchQueryTokens(query);
  const parts: string[] = [];

  for (const col of columns) {
    for (const token of tokens) {
      const safe = escapeIlikePattern(token);
      parts.push(`${col}.ilike.%${safe}%`);
    }
  }

  return parts.join(",");
}
