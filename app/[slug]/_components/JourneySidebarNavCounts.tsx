import { JourneySidebarSwitchNav } from "@/components/journey/JourneySidebarSwitchNav";
import { fetchJourneySwitchNavCounts } from "@/lib/journey/journey-nav-counts";

type Props = {
  ownerId: string;
  ownerSlug: string;
};

export async function JourneySidebarNavCounts({
  ownerId,
  ownerSlug,
}: Props) {
  const { friendCount, orgCount } = await fetchJourneySwitchNavCounts({ ownerId });

  return (
    <JourneySidebarSwitchNav
      slug={ownerSlug}
      friendCount={friendCount}
      orgCount={orgCount}
    />
  );
}
