type Props = {
  embedded?: boolean;
};

export function AdminBaiVietTableSkeleton({ embedded = false }: Props) {
  const body = (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar__row">
          <div className="admin-skel admin-skel-search" />
          <div className="admin-skel admin-skel-icon-btn" />
          {!embedded ? (
            <>
              <div className="admin-skel admin-skel-btn" />
              <div className="admin-skel admin-skel-btn admin-skel-btn--primary" />
            </>
          ) : null}
        </div>
        <div className="filter-bar filter-bar--articles">
          <div className="admin-skel admin-skel-filter" />
          <div className="admin-skel admin-skel-filter" />
          <div className="admin-skel admin-skel-filter-count" />
        </div>
      </div>
      <div className="table-wrap table-wrap--articles">
        <table className="admin-articles-table">
          <thead>
            <tr>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <th key={i}>
                  <div className="admin-skel admin-skel-th" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <tr key={i}>
                <td>
                  <div className="admin-skel admin-skel-thumb" />
                </td>
                <td colSpan={6}>
                  <div className="admin-skel admin-skel-cell" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div
        className="page-body admin-bai-viet-body admin-bai-viet-skel"
        aria-busy="true"
        aria-label="Đang tải danh sách bài viết"
      >
        {body}
      </div>
    );
  }

  return (
    <div
      className="admin-bai-viet-skel"
      aria-busy="true"
      aria-label="Đang tải danh sách bài viết"
    >
      <header className="page-header admin-bai-viet-header">
        <div className="admin-skel admin-skel-page-title" />
      </header>
      <nav className="admin-bai-viet-tabs" aria-hidden>
        <div className="admin-skel admin-skel-tab" />
        <div className="admin-skel admin-skel-tab" />
      </nav>
      <div className="page-body admin-bai-viet-body">{body}</div>
    </div>
  );
}
