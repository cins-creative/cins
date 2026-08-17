type Props = {
  tieu_de: string;
};

/** Chỉ tiêu đề bài — không dòng phụ Việt/Anh. */
export function TagSuggestionLabel({ tieu_de }: Props) {
  return (
    <span className="tag-input-item-titles">
      <span className="tag-input-item-label">{tieu_de.trim()}</span>
    </span>
  );
}
