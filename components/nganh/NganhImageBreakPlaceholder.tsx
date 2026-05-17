/** Fallback khi chưa có `meta.editorial_images`. */
export function NganhImageBreakPlaceholder() {
  return (
    <div className="nct-image-break" aria-hidden>
      <div className="nct-image-break-inner">
        <span className="nct-image-break-label">Minh họa ngành học</span>
      </div>
    </div>
  );
}
