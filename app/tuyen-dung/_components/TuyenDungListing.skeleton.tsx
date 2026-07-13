export function TuyenDungListingSkeleton() {
  return (
    <div aria-hidden>
      <header className="td-hub-header td-hub-header--sk">
        <div className="td-hub-header__glass" aria-hidden="true" />
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="td-hub-header__inner">
          <div className="td-hub-panel td-hub-panel--sk">
            <div className="td-hub-row td-hub-row--main">
              <span className="tuyen-dung-sk td-hub-sk-scope" />
              <span className="tuyen-dung-sk td-hub-sk-search" />
            </div>
            <div className="td-hub-filter-groups">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="tuyen-dung-sk td-hub-sk-group" />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="tuyen-dung-body">
        <ul className="tuyen-dung-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="tuyen-dung-card tuyen-dung-card--sk">
              <div className="tuyen-dung-card-head">
                <span className="tuyen-dung-logo tuyen-dung-sk" />
                <div className="tuyen-dung-card-titles">
                  <span className="tuyen-dung-sk tuyen-dung-sk-line" style={{ width: "70%" }} />
                  <span className="tuyen-dung-sk tuyen-dung-sk-line" style={{ width: "45%" }} />
                </div>
              </div>
              <div className="tuyen-dung-chips">
                <span className="tuyen-dung-sk tuyen-dung-sk-chip" />
                <span className="tuyen-dung-sk tuyen-dung-sk-chip" />
              </div>
              <span className="tuyen-dung-sk tuyen-dung-sk-line" style={{ width: "90%" }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
