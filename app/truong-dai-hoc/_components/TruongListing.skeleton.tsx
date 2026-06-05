export function TruongListingSkeleton() {
  return (
    <div className="tdh-page" aria-busy="true" aria-label="Đang tải danh sách trường">
      <div className="tdh-list">
        <section className="tdh-list-hero">
          <div className="tdh-list-hero-inner">
            <div className="tdh-skel tdh-skel-kicker" />
            <div className="tdh-skel tdh-skel-title" />
            <div className="tdh-skel tdh-skel-lead" />
          </div>
        </section>
        <div className="tdh-list-stats">
          <div className="tdh-list-stats-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="tdh-skel tdh-skel-stat" />
            ))}
          </div>
        </div>
        <div className="tdh-list-toolbar">
          <div className="tdh-list-toolbar-inner">
            <div className="tdh-skel tdh-skel-pills" />
            <div className="tdh-skel tdh-skel-search" />
          </div>
        </div>
        <div className="tdh-list-body">
          <div className="tdh-list-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="tdh-skel tdh-skel-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
