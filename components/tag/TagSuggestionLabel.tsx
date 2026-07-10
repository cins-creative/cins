import type { TagSuggestRow } from "@/lib/tag/suggest-types";

type Props = Pick<
  TagSuggestRow,
  "tieu_de" | "tieu_de_viet" | "tieu_de_eng"
>;

/** Tiêu đề chính + dòng phụ tiếng Việt / tiếng Anh (nếu khác nhau). */
export function TagSuggestionLabel({
  tieu_de,
  tieu_de_viet,
  tieu_de_eng,
}: Props) {
  const primary = tieu_de.trim();
  const primaryKey = primary.toLowerCase();
  const altParts: string[] = [];
  const seen = new Set<string>([primaryKey]);

  for (const raw of [tieu_de_viet, tieu_de_eng]) {
    const t = raw?.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    altParts.push(t);
  }

  return (
    <span className="tag-input-item-titles">
      <span className="tag-input-item-label">{primary}</span>
      {altParts.length > 0 ? (
        <span className="tag-input-item-alt">{altParts.join(" · ")}</span>
      ) : null}
    </span>
  );
}
