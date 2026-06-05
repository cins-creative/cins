export function NgheNghiepHubSkeleton() {
  return (
    <div className="career-page career-page--hub" aria-busy="true" aria-label="Đang tải nghề nghiệp">
      <div className="career-hub career-hub--hn">
        <div className="career-skeleton career-skeleton--hub-head" />
        <div className="hn-main career-hub-skel-main">
          <div className="career-skeleton career-skeleton--hub-rail" />
          <div className="hn-content career-hub-skel-content">
            <div className="career-skeleton career-skeleton--hub-hero" />
            <div className="career-skeleton career-skeleton--hub-tabs" />
            <div className="career-skeleton career-skeleton--hub-dept" />
            <div className="career-skeleton career-skeleton--hub-dept short" />
          </div>
        </div>
      </div>
    </div>
  );
}
