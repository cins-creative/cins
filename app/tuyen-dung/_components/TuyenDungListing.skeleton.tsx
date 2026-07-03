export function TuyenDungListingSkeleton() {
  return (
    <div aria-hidden>
      <div className="tuyen-dung-count-sk tuyen-dung-sk" />
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
  );
}
