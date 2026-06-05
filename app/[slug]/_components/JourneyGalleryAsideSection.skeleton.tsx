export function JourneyGalleryAsideSectionSkeleton() {

  return (

    <aside

      className="j-gallery j-skel-gallery"

      aria-busy="true"

      aria-label="Đang tải tác phẩm"

    >

      <div className="j-gallery-head">

        <div className="j-skel j-skel-gallery-title" />

        <div className="j-skel j-skel-gallery-filter" aria-hidden />

      </div>

      <div className="j-skel j-skel-gallery-pin" />

      <div className="j-skel-gallery-grid">

        {[0, 1, 2, 3].map((i) => (

          <div key={i} className="j-skel j-skel-gallery-item" />

        ))}

      </div>

    </aside>

  );

}

