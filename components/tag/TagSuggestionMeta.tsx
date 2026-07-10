import { articleTagLabel } from "@/lib/editor/article-tag";
import type { PickableTagLoai } from "@/lib/tag/tag-loai";

type Props = {
  loai: PickableTagLoai;
  linhVucTen?: string | null;
  soNguoiTagged?: number;
};

function formatUsageCount(n: number): string {
  if (n <= 0) return "";
  return n === 1 ? "1 người" : `${n} người`;
}

/** Badge phụ trong menu gợi ý tag — loại, lĩnh vực, số người đã gắn. */
export function TagSuggestionMeta({
  loai,
  linhVucTen,
  soNguoiTagged = 0,
}: Props) {
  const lv = linhVucTen?.trim();
  const usage = formatUsageCount(soNguoiTagged);
  return (
    <>
      <span className={`tag-input-item-loai is-loai-${loai.replace(/_/g, "-")}`}>
        {articleTagLabel(loai)}
      </span>
      {lv ? <span className="tag-input-item-linh-vuc">{lv}</span> : null}
      {usage ? (
        <span className="tag-input-item-usage" title="Số người đã gắn tag này">
          {usage}
        </span>
      ) : null}
    </>
  );
}
