import { JourneyPendingConfirmationsStack } from "@/components/journey/JourneyPendingConfirmationsStack";
import { listPendingDongGopFeedbackBanners } from "@/lib/article/dong-gop/notify-feedback";
import {
  getCachedOutboundMembershipPending,
  getCachedPendingCoAuthorInvites,
  getCachedPendingCoSoStaffInvites,
} from "@/lib/journey/journey-page-cache";

/** Banner việc cần xác nhận — Suspense riêng, không chặn feed. */
export async function HomePendingConfirmations({
  viewerProfileId,
  ownerSlug,
  ownerName,
  ownerAvatarUrl,
}: {
  viewerProfileId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
}) {
  const [
    coAuthorPendingInvites,
    coSoStaffPendingInvites,
    membershipPendingOutbound,
    dongGopFeedbackPending,
  ] = await Promise.all([
    getCachedPendingCoAuthorInvites(viewerProfileId),
    getCachedPendingCoSoStaffInvites(viewerProfileId),
    getCachedOutboundMembershipPending(viewerProfileId),
    listPendingDongGopFeedbackBanners(viewerProfileId),
  ]);

  return (
    <JourneyPendingConfirmationsStack
      isOwner
      viewerProfileId={viewerProfileId}
      ownerSlug={ownerSlug}
      ownerName={ownerName}
      ownerAvatarUrl={ownerAvatarUrl}
      initialCoAuthorInvites={coAuthorPendingInvites}
      initialCoSoStaffInvites={coSoStaffPendingInvites}
      initialMembershipPending={membershipPendingOutbound}
      initialDongGopFeedback={dongGopFeedbackPending}
    />
  );
}
