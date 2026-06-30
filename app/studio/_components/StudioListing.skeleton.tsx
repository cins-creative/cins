export function StudioListingSkeleton() {
  return (
    <div
      className="tdh-page"
      aria-busy="true"
      aria-label="Đang tải danh sách studio"
    >
      <div className="tdh-list">
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
