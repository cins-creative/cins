type Props = {
  title: string;
  hint?: string;
};

/** Khung placeholder khi chưa có media (vẫn hiển thị trên trang). */
export function NganhMediaEmpty({ title, hint }: Props) {
  return (
    <div className="nct-media-empty" role="img" aria-label={title}>
      <span className="nct-media-empty-title">{title}</span>
      {hint ? <span className="nct-media-empty-hint">{hint}</span> : null}
    </div>
  );
}
