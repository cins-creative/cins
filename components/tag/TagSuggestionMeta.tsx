import { articleTagLabel } from "@/lib/editor/article-tag";
import type { PickableTagLoai } from "@/lib/tag/tag-loai";

type Props = {
  loai: PickableTagLoai;
  linhVucTen?: string | null;
};

/** Badge phụ trong menu gợi ý tag — lĩnh vực (nghề) + loại bài. */
export function TagSuggestionMeta({ loai, linhVucTen }: Props) {
  const lv = linhVucTen?.trim();
  return (
    <>
      {lv ? <span className="tag-input-item-linh-vuc">{lv}</span> : null}
      <span className={`tag-input-item-loai is-loai-${loai.replace(/_/g, "-")}`}>
        {articleTagLabel(loai)}
      </span>
    </>
  );
}
