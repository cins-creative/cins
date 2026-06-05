import { JourneyGalleryAside } from "@/components/journey/JourneyGalleryAside";
import { getCachedGalleryForUser } from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
};

export async function JourneyGalleryAsideSection({
  ownerId,
  ownerSlug,
}: Props) {
  const { pinned, items, totalTacPham } = await getCachedGalleryForUser({
    userId: ownerId,
    ownerSlug,
  });

  return (
    <JourneyGalleryAside
      ownerSlug={ownerSlug}
      totalTacPham={totalTacPham}
      pinned={pinned}
      items={items}
    />
  );
}
