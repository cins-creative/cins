import { CinsShell } from "@/components/cins/CinsShell";

/** Skeleton tổng cho segment — hiện ngay khi điều hướng tới /tim-kiem. */
export default function TimKiemLoading() {
  return (
    <CinsShell data-screen-label="Tim-kiem">
      <div className="tk-page tk-page--loading" aria-busy="true">
        <div className="tk-hero tk-hero--skeleton" />
        <div className="tk-body">
          <div className="tk-toolbar tk-toolbar--skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="tk-skel-tab" />
            ))}
          </div>
          <div className="tk-results">
            {Array.from({ length: 2 }).map((_, i) => (
              <section key={i} className="tk-section tk-section--pending">
                <div className="tk-skel-head">
                  <span className="tk-skel-icon" />
                  <span className="tk-skel-copy">
                    <span className="tk-skel-line tk-skel-line--title" />
                    <span className="tk-skel-line tk-skel-line--sub" />
                  </span>
                </div>
                <ul className="tk-grid tk-grid--orgs">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <li key={j}>
                      <div className="tk-skel-card tk-skel-card--orgs" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </CinsShell>
  );
}
