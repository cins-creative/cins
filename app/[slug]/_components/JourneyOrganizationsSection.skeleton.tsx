export function JourneyOrganizationsSectionSkeleton() {
  return (
    <section className="j-orgs" aria-busy="true" aria-label="Tổ chức">
      <div className="j-orgs-head">
        <h2 className="j-orgs-title">Tổ chức</h2>
      </div>
      <div className="j-orgs-list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="j-org-card j-org-card--skel" aria-hidden />
        ))}
      </div>
    </section>
  );
}
