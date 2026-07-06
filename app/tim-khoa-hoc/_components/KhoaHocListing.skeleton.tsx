export function KhoaHocListingSkeleton() {
  return (
    <div aria-hidden>
      <div className="tkh-count-sk tkh-sk" />
      <ul className="tkh-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="tkh-card tkh-card--sk">
            <div className="tkh-card-cover-sk tkh-sk" />
            <div className="tkh-card-body">
              <span className="tkh-sk tkh-sk-line" style={{ width: "45%" }} />
              <span className="tkh-sk tkh-sk-line" style={{ width: "80%" }} />
              <span className="tkh-sk tkh-sk-line" style={{ width: "95%" }} />
              <div className="tkh-card-chips">
                <span className="tkh-sk tkh-sk-chip" />
                <span className="tkh-sk tkh-sk-chip" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
