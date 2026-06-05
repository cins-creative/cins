import { JourneyFriendsView } from "@/components/journey/JourneyFriendsView";
import { getCachedMutualFriendsPage } from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
};

export async function JourneyFriendsSection({ ownerId, ownerSlug }: Props) {
  const page = await getCachedMutualFriendsPage(ownerId, { offset: 0 });

  return (
    <JourneyFriendsView
      initialFriends={page.friends}
      totalCount={page.totalCount}
      scrollLoad={{
        ownerSlug,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      }}
    />
  );
}
