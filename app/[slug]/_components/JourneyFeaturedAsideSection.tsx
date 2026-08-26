import { JourneyFeaturedAsidePanel } from "@/components/journey/JourneyFeaturedAsidePanel";
import { getCachedGalleryForUser } from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
  isOwner?: boolean;
  viewerId?: string | null;
};

export async function JourneyFeaturedAsideSection({
  ownerId,
  ownerSlug,
  isOwner = false,
  viewerId = null,
}: Props) {
  try {
    const { pinned } = await getCachedGalleryForUser({
      userId: ownerId,
      ownerSlug,
      viewerId: isOwner ? viewerId ?? ownerId : viewerId,
    });

    return (
      <JourneyFeaturedAsidePanel
        ownerSlug={ownerSlug}
        initialPinned={pinned}
        isOwner={isOwner}
      />
    );
  } catch (err) {
    console.error("[journey-profile] featured-aside", err);
    return null;
  }
}
