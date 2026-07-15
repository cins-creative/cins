import { JourneyFeaturedAsidePanel } from "@/components/journey/JourneyFeaturedAsidePanel";
import { getCachedGalleryForUser } from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
  isOwner?: boolean;
};

export async function JourneyFeaturedAsideSection({
  ownerId,
  ownerSlug,
  isOwner = false,
}: Props) {
  const { pinned } = await getCachedGalleryForUser({
    userId: ownerId,
    ownerSlug,
  });

  return (
    <JourneyFeaturedAsidePanel
      ownerSlug={ownerSlug}
      initialPinned={pinned}
      isOwner={isOwner}
    />
  );
}
