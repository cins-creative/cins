import type { TimKhoaHocLoai } from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-params";

export function TimKhoaHocHubSkeleton({ loai = "all" }: { loai?: TimKhoaHocLoai }) {
  const showKhoa = loai === "all" || loai === "khoa";
  const showNganh = loai === "all" || loai === "nganh";

  return (
    <div aria-hidden>
      <header className="tkh-hub-header">
        <div className="tkh-hub-header__glass" aria-hidden="true" />
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="tkh-hub-header__inner">
          <div className="tkh-hub-panel tkh-hub-panel--sk">
            <div className="tkh-sk" style={{ height: 36, borderRadius: 10 }} />
            {showKhoa ? (
              <div className="tkh-sk" style={{ height: 32, borderRadius: 8, marginTop: 8 }} />
            ) : null}
          </div>
        </div>
      </header>

      <div className="tkh-body">
        {showKhoa ? (
          <section className="tkh-section">
            <div className="tkh-section-head">
              <div className="tkh-section-icon tkh-sk" />
              <div className="tkh-sk tkh-sk-line" style={{ width: "200px", height: 20 }} />
            </div>
            <ul className="tkh-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="tkh-card tkh-card--sk">
                  <div className="tkh-card-cover-sk tkh-sk" />
                  <div className="tkh-card-body">
                    <span className="tkh-sk tkh-sk-line" style={{ width: "45%" }} />
                    <span className="tkh-sk tkh-sk-line" style={{ width: "80%" }} />
                    <span className="tkh-sk tkh-sk-line" style={{ width: "95%" }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showNganh ? (
          <section className="tkh-section tkh-section--nganh">
            <div className="tkh-section-head">
              <div className="tkh-section-icon tkh-sk" />
              <div className="tkh-sk tkh-sk-line" style={{ width: "180px", height: 20 }} />
            </div>
            <ul className="hn-role-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i}>
                  <div className="tkh-sk" style={{ aspectRatio: "3/4", borderRadius: 16 }} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
