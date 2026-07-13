export function JourneyTimelineSectionSkeleton() {
  return (
    <main
      className="j-timeline j-skel-timeline"
      aria-busy="true"
      aria-label="Đang tải timeline"
    >
      <div className="j-tlb">
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="j-skel j-skel-tl-year" />
        <div className="j-skel j-skel-tl-month" />
        <div className="j-skel j-skel-tl-filter" />
      </div>

      <div className="j-create-composer j-skel-composer" aria-hidden>
        <div className="j-create-composer-actions">
          {[0, 1, 2].map((i) => (
            <div key={i} className="j-skel j-skel-composer-action" />
          ))}
        </div>
      </div>

      <article className="j-milestone">
        <div className="j-m-body-wrap">
          <div className="j-m-card jcard j-skel-post-card">
            <div className="jcard-datebar">
              <div className="j-skel j-skel-post-avatar" />
              <div className="j-skel-post-badges">
                <div className="j-skel j-skel-post-badge" />
                <div className="j-skel j-skel-post-badge" />
              </div>
            </div>
            <div className="jcard-body">
              <div className="j-skel j-skel-post-line j-skel-post-line--title" />
              <div className="j-skel-post-media-grid">
                <div className="j-skel j-skel-post-media-main" />
                <div className="j-skel j-skel-post-media-side" />
              </div>
            </div>
            <div className="jcard-actions">
              <div className="j-skel j-skel-post-action" />
              <div className="j-skel j-skel-post-action" />
            </div>
          </div>
        </div>
      </article>

      <article className="j-milestone">
        <div className="j-m-body-wrap">
          <div className="j-m-card jcard j-skel-post-card">
            <div className="jcard-datebar">
              <div className="j-skel j-skel-post-avatar" />
              <div className="j-skel-post-badges">
                <div className="j-skel j-skel-post-badge" />
                <div className="j-skel j-skel-post-badge" />
              </div>
            </div>
            <div className="jcard-body">
              <div className="j-skel j-skel-post-line j-skel-post-line--title" />
              <div className="j-skel j-skel-post-line" />
              <div className="j-skel j-skel-post-preview" />
            </div>
            <div className="jcard-actions">
              <div className="j-skel j-skel-post-action" />
              <div className="j-skel j-skel-post-action" />
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
