export function JourneyGalleryMainSectionSkeleton() {
  return (
    <main
      className="j-main-panel j-gallery-main j-skel-main-panel"
      aria-busy="true"
      aria-label="Đang tải gallery"
    >
      <div className="j-tlb">
        <div className="j-skel j-skel-tl-year" />
        <div className="j-skel j-skel-tl-month" />
        <div className="j-skel j-skel-tl-filter" />
      </div>
      <div className="j-skel-main-gallery-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="j-skel j-skel-main-gallery-item" />
        ))}
      </div>
    </main>
  );
}
