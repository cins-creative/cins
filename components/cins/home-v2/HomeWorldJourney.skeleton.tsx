/** Skeleton trang chủ logged-in — token CINS / j-skel (DEV_RULES §8). */
export function HomeWorldJourneySkeleton() {
  return (
    <div
      className="world-journey-home cins-journey-page"
      aria-busy="true"
      aria-label="Đang tải trang chủ"
    >
      <div className="wj-shell">
        <aside className="wj-guest-aside wj-guest-aside--left ha-col" aria-hidden>
          <div className="j-skel" style={{ height: 28, width: "55%", marginBottom: 12 }} />
          <div className="j-skel" style={{ height: 56, width: "100%", marginBottom: 8 }} />
          <div className="j-skel" style={{ height: 56, width: "100%", marginBottom: 8 }} />
          <div className="j-skel" style={{ height: 56, width: "100%" }} />
        </aside>

        <div className="wj-feed">
          <div className="j-skel" style={{ height: 40, width: "100%", marginBottom: 16 }} />
          <div className="j-skel" style={{ height: 72, width: "100%", marginBottom: 20 }} />
          <article className="j-milestone">
            <div className="j-m-body-wrap">
              <div className="j-m-card jcard j-skel-post-card">
                <div className="jcard-datebar">
                  <div className="j-skel j-skel-post-avatar" />
                  <div className="j-skel-post-badges">
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
              </div>
            </div>
          </article>
          <article className="j-milestone">
            <div className="j-m-body-wrap">
              <div className="j-m-card jcard j-skel-post-card">
                <div className="jcard-datebar">
                  <div className="j-skel j-skel-post-avatar" />
                </div>
                <div className="jcard-body">
                  <div className="j-skel j-skel-post-line j-skel-post-line--title" />
                  <div className="j-skel j-skel-post-line" />
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="wj-guest-aside wj-guest-aside--right ha-col" aria-hidden>
          <div className="j-skel" style={{ height: 28, width: "50%", marginBottom: 12 }} />
          <div className="j-skel" style={{ height: 64, width: "100%", marginBottom: 8 }} />
          <div className="j-skel" style={{ height: 64, width: "100%" }} />
        </aside>
      </div>
    </div>
  );
}

export function HomeAsideSkeleton({ side }: { side: "left" | "right" }) {
  return (
    <aside
      className={`wj-guest-aside wj-guest-aside--${side} ha-col ha-col--${side}`}
      aria-busy="true"
      aria-label="Đang tải gợi ý"
    >
      <div className="j-skel" style={{ height: 28, width: "55%", marginBottom: 12 }} />
      <div className="j-skel" style={{ height: 56, width: "100%", marginBottom: 8 }} />
      <div className="j-skel" style={{ height: 56, width: "100%", marginBottom: 8 }} />
      <div className="j-skel" style={{ height: 56, width: "100%" }} />
    </aside>
  );
}
