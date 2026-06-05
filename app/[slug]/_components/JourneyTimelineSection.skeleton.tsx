export function JourneyTimelineSectionSkeleton() {
  return (
    <section
      className="j-timeline j-skel-timeline"
      aria-busy="true"
      aria-label="Đang tải timeline"
    >
      <div className="j-tl-bar j-skel-tl-bar">
        <div className="j-skel j-skel-tl-year" />
        <div className="j-skel j-skel-tl-month" />
        <div className="j-skel j-skel-tl-filter" />
      </div>
      <div className="j-skel-year-label" />
      {[0, 1, 2].map((i) => (
        <article key={i} className="j-skel-milestone">
          <div className="j-skel j-skel-m-month" />
          <div className="j-skel-card">
            <div className="j-skel j-skel-card-head" />
            <div className="j-skel j-skel-card-title" />
            <div className="j-skel j-skel-card-line" />
            <div className="j-skel j-skel-card-line j-skel-card-line--short" />
            <div className="j-skel j-skel-card-media" />
          </div>
        </article>
      ))}
    </section>
  );
}
