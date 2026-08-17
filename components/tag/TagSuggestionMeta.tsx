import { articleTagLabel } from "@/lib/editor/article-tag";
import type { PickableTagLoai } from "@/lib/tag/tag-loai";

type Props = {
  loai: PickableTagLoai;
  linhVucTen?: string | null;
  soNguoiTagged?: number;
  /** Số bài đăng gắn — thay nhãn loại với fandom/phân loại. */
  soGan?: number;
  /** Compose: số gắn + số người, không badge loại. */
  compose?: boolean;
};

function formatUsageCount(n: number): string {
  if (n <= 0) return "";
  return n === 1 ? "1 người" : `${n} người`;
}

function formatTagGanCount(n: number): string {
  return `#${Math.max(0, n)}`;
}

/** Badge phụ trong menu gợi ý tag. Compose: số gắn + số người — không hiện loại / lĩnh vực. */
export function TagSuggestionMeta({
  loai,
  linhVucTen,
  soNguoiTagged = 0,
  soGan = 0,
  compose = false,
}: Props) {
  const lv = linhVucTen?.trim();
  const usage = formatUsageCount(soNguoiTagged);
  const isFandom = loai === "fandom";
  const gan = (
    <span
      className="tag-input-item-loai is-loai-fandom is-count"
      title="Số bài đăng đã gắn thẻ này"
    >
      {formatTagGanCount(soGan)}
    </span>
  );
  if (compose) {
    return (
      <span className="tag-input-item-meta">
        {usage ? (
          <span className="tag-input-item-usage" title="Số người đã gắn tag này">
            {usage}
          </span>
        ) : null}
        {gan}
      </span>
    );
  }
  return (
    <span className="tag-input-item-meta">
      {isFandom ? (
        <span
          className="tag-input-item-loai is-loai-fandom is-count"
          title="Số bài đăng gắn phân loại này"
        >
          {formatTagGanCount(soGan)}
        </span>
      ) : (
        <span
          className={`tag-input-item-loai is-loai-${loai.replace(/_/g, "-")}`}
        >
          {articleTagLabel(loai)}
        </span>
      )}
      {lv ? <span className="tag-input-item-linh-vuc">{lv}</span> : null}
      {usage ? (
        <span className="tag-input-item-usage" title="Số người đã gắn tag này">
          {usage}
        </span>
      ) : null}
    </span>
  );
}
