type Props = {
  preview: string | null;
  hasData: boolean;
  emptyLabel?: string;
  title?: string;
};

export function AdminArticleDataPreview({
  preview,
  hasData,
  emptyLabel = "—",
  title,
}: Props) {
  if (!hasData || !preview) {
    return (
      <span className="admin-cell-preview admin-cell-preview--empty" title={title}>
        {emptyLabel}
      </span>
    );
  }
  return (
    <span className="admin-cell-preview admin-cell-preview--yes" title={preview}>
      {preview}
    </span>
  );
}
