export function JourneyGalleryMainSectionSkeleton() {
  return (
    <section
      className="j-main-panel j-skel-main-panel"
      aria-busy="true"
      aria-label="Đang tải gallery"
    >
      <div className="j-main-panel-head">
        <div className="j-skel j-skel-panel-label" />
        <div className="j-skel j-skel-panel-count" />
      </div>
      <div className="j-skel-main-gallery-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="j-skel j-skel-main-gallery-item" />
        ))}
      </div>
    </section>
  );
}
