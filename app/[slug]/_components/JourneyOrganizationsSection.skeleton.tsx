import { JourneyOrgMembershipCardSkeleton } from "@/components/journey/JourneyOrgMembershipCard";

export function JourneyOrganizationsSectionSkeleton() {
  return (
    <section className="j-orgs" aria-busy="true" aria-label="Tổ chức">
      <div className="j-orgs-head">
        <h2 className="j-orgs-title">Tổ chức</h2>
      </div>
      <ul className="j-orgs-list">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <JourneyOrgMembershipCardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}
