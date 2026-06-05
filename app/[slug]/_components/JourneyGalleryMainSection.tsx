import { JourneyGalleryGridView } from "@/components/journey/JourneyGalleryGridView";
import { getCachedGalleryMainPage } from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
};

export async function JourneyGalleryMainSection({
  ownerId,
  ownerSlug,
}: Props) {
  const page = await getCachedGalleryMainPage({
    userId: ownerId,
    ownerSlug,
    offset: 0,
  });

  return (
    <JourneyGalleryGridView
      initialItems={page.items}
      totalCount={page.totalCount}
      scrollLoad={{
        ownerSlug,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      }}
    />
  );
}
