import { JourneyFeaturedAsidePanel } from "@/components/journey/JourneyFeaturedAsidePanel";
import { getCachedGalleryForUser } from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
};

export async function JourneyFeaturedAsideSection({
  ownerId,
  ownerSlug,
}: Props) {
  const { pinned } = await getCachedGalleryForUser({
    userId: ownerId,
    ownerSlug,
  });

  return (
    <JourneyFeaturedAsidePanel
      ownerSlug={ownerSlug}
      initialPinned={pinned}
    />
  );
}
