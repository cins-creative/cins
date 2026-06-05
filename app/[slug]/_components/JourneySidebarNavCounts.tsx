import { JourneySidebarSwitchNav } from "@/components/journey/JourneySidebarSwitchNav";
import { getCachedJourneySwitchNavCounts } from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
  isOwner: boolean;
  viewerProfileId: string | null;
};

export async function JourneySidebarNavCounts({
  ownerId,
  ownerSlug,
  isOwner: _isOwner,
  viewerProfileId: _viewerProfileId,
}: Props) {
  void _isOwner;
  void _viewerProfileId;

  const counts = await getCachedJourneySwitchNavCounts({ ownerId });

  return (
    <JourneySidebarSwitchNav
      slug={ownerSlug}
      cotMoc={counts.journeyCount}
      tacPham={counts.galleryCount}
      friendCount={counts.friendCount}
    />
  );
}
