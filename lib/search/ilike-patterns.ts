import { escapeIlikePattern } from "@/lib/search/helpers";
import { normalizeSearchText, searchQueryTokens } from "@/lib/search/normalize";

function isSlugColumn(col: string): boolean {
  return col === "slug" || col.endsWith(".slug");
}

export type BuildIlikeOptions = {
  /**
   * Chỉ cả chuỗi query (không tách token) — ưu tiên khớp cụm/tiêu đề exact.
   * Tránh token ngắn ("họa", "web", "ứng") làm ngập pool FETCH_LIMIT.
   */
  phraseOnly?: boolean;
  /** Bỏ token ngắn hơn ngưỡng (sau normalize). Mặc định 3. */
  minTokenLength?: number;
};

/** OR nhiều cột × token — mở rộng recall; dùng `phraseOnly` cho tầng chính xác. */
export function buildSupabaseOrIlike(
  columns: readonly string[],
  query: string,
  options: BuildIlikeOptions = {},
): string {
  const phraseOnly = options.phraseOnly === true;
  const minTokenLength = options.minTokenLength ?? 3;
  const trimmed = query.trim();
  if (!trimmed) return "";

  const tokens = phraseOnly
    ? [trimmed]
    : searchQueryTokens(trimmed).filter((token) => {
        if (token === trimmed) return true;
        return normalizeSearchText(token).replace(/\s+/g, "").length >= minTokenLength;
      });

  const parts: string[] = [];
  const asciiFull = normalizeSearchText(trimmed);
  const asciiHyphen = asciiFull.replace(/\s+/g, "-");
  const asciiCompact = asciiFull.replace(/\s+/g, "");

  for (const col of columns) {
    for (const token of tokens) {
      const safe = escapeIlikePattern(token);
      parts.push(`${col}.ilike.%${safe}%`);

      const ascii = normalizeSearchText(token);
      if (ascii && ascii !== token.toLowerCase()) {
        parts.push(`${col}.ilike.%${escapeIlikePattern(ascii)}%`);
      }

      /* Token nhiều từ → dạng slug `a-b` (vd. "hinh hoa" → "hinh-hoa"). */
      if (isSlugColumn(col) && ascii.includes(" ")) {
        const tokenHyphen = ascii.replace(/\s+/g, "-");
        if (tokenHyphen) {
          parts.push(`${col}.ilike.%${escapeIlikePattern(tokenHyphen)}%`);
        }
      }
    }

    /*
     * Query bỏ dấu vs tiêu đề có dấu: Postgres `ilike` không khớp.
     * Slug entity (mon-hinh-hoa, …) thường ASCII → bổ sung dạng gạch/ghép.
     */
    if (isSlugColumn(col) && asciiFull) {
      if (asciiHyphen) {
        parts.push(`${col}.ilike.%${escapeIlikePattern(asciiHyphen)}%`);
      }
      if (asciiCompact && asciiCompact !== asciiHyphen) {
        parts.push(`${col}.ilike.%${escapeIlikePattern(asciiCompact)}%`);
      }
    }
  }

  return parts.join(",");
}
