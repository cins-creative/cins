export function JourneyFeaturedAsideSectionSkeleton() {
  return (
    <aside
      className="j-gallery j-skel-gallery"
      aria-busy="true"
      aria-label="Đang tải bài nổi bật"
    >
      <div className="j-gallery-head">
        <div className="j-skel j-skel-gallery-title" />
        <div className="j-skel j-skel-gallery-filter" aria-hidden />
      </div>
      <div className="j-skel j-skel-gallery-pin" />
    </aside>
  );
}
