import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import { listPendingDongGopFeedbackBanners } from "@/lib/article/dong-gop/notify-feedback";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import {
  getCachedMilestoneTimelinePage,
  getCachedPendingCoAuthorInvites,
  getCachedPendingCoSoStaffInvites,
  getCachedPendingCongDongInvites,
  getCachedOutboundMembershipPending,
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
  const [
    page,
    coAuthorPendingInvites,
    coSoStaffPendingInvites,
    congDongPendingInvites,
    membershipPendingOutbound,
    dongGopFeedbackPending,
  ] = await Promise.all([
    getCachedMilestoneTimelinePage({
      userId: ownerId,
      isOwner,
      viewerId: viewerProfileId,
      offset: 0,
    }),
    isOwner && viewerProfileId
      ? getCachedPendingCoAuthorInvites(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? getCachedPendingCoSoStaffInvites(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? getCachedPendingCongDongInvites(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? getCachedOutboundMembershipPending(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? listPendingDongGopFeedbackBanners(viewerProfileId)
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
      coSoStaffPendingInvites={coSoStaffPendingInvites}
      congDongPendingInvites={congDongPendingInvites}
      membershipPendingOutbound={membershipPendingOutbound}
      dongGopFeedbackPending={dongGopFeedbackPending}
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
