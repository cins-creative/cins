import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import {
  getCachedMilestoneTimelinePage,
  getCachedPendingCoAuthorInvites,
} from "@/lib/journey/journey-page-cache";

type Props = {
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  isOwner: boolean;
  viewerProfileId: string | null;
  filterVisibility: LoaiMocVisibilityMap;
};

export async function JourneyTimelineSection({
  ownerId,
  ownerSlug,
  ownerName,
  ownerAvatarUrl,
  isOwner,
  viewerProfileId,
  filterVisibility,
}: Props) {
  const [page, coAuthorPendingInvites] = await Promise.all([
    getCachedMilestoneTimelinePage({
      userId: ownerId,
      isOwner,
      viewerId: viewerProfileId,
      offset: 0,
    }),
    isOwner && viewerProfileId
      ? getCachedPendingCoAuthorInvites(viewerProfileId)
      : Promise.resolve([]),
  ]);

  return (
    <JourneyTimeline
      isOwner={isOwner}
      ownerName={ownerName}
      ownerSlug={ownerSlug}
      ownerAvatarUrl={ownerAvatarUrl}
      milestones={page.milestones}
      filterVisibility={filterVisibility}
      viewerProfileId={viewerProfileId}
      coAuthorPendingInvites={coAuthorPendingInvites}
      scrollLoad={{
        ownerSlug,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
        filterCounts: page.filterCounts,
        totalCount: page.totalCount,
      }}
    />
  );
}
