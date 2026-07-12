"use client";

import { JourneyCoAuthorPendingBanner } from "@/components/journey/JourneyCoAuthorPendingBanner";
import { JourneyCoAuthorReviewBanner } from "@/components/journey/JourneyCoAuthorReviewBanner";
import { JourneyCoSoStaffInviteBanner } from "@/components/journey/JourneyCoSoStaffInviteBanner";
import { JourneyCongDongInviteBanner } from "@/components/journey/JourneyCongDongInviteBanner";
import { JourneyDongGopFeedbackBanner } from "@/components/journey/JourneyDongGopFeedbackBanner";
import { JourneyFollowRequestBanner } from "@/components/journey/JourneyFollowRequestBanner";
import { JourneyMembershipPendingBanner } from "@/components/journey/JourneyMembershipPendingBanner";
import { useJourneyPendingConfirmations } from "@/lib/journey/use-journey-pending-confirmations";
import type { DongGopFeedbackBannerItem } from "@/lib/article/dong-gop/notify-feedback";
import type { OutboundMembershipPending } from "@/lib/journey/membership-milestone-types";
import type { PendingCoAuthorInvite } from "@/lib/social/types";
import type { PendingCongDongInviteNotification } from "@/lib/cong-dong/invite";
import type { PendingCoSoStaffInviteNotification } from "@/lib/to-chuc/co-so-staff-invite";

type Props = {
  isOwner: boolean;
  viewerProfileId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  initialCoAuthorInvites: ReadonlyArray<PendingCoAuthorInvite>;
  initialCoSoStaffInvites: ReadonlyArray<PendingCoSoStaffInviteNotification>;
  initialCongDongInvites?: ReadonlyArray<PendingCongDongInviteNotification>;
  initialMembershipPending?: ReadonlyArray<OutboundMembershipPending>;
  initialDongGopFeedback?: ReadonlyArray<DongGopFeedbackBannerItem>;
};

/** Banner xác nhận trên timeline — đồng bộ với menu thông báo. */
export function JourneyPendingConfirmationsStack({
  isOwner,
  viewerProfileId,
  ownerSlug,
  ownerName,
  ownerAvatarUrl = null,
  initialCoAuthorInvites,
  initialCoSoStaffInvites,
  initialCongDongInvites = [],
  initialMembershipPending = [],
  initialDongGopFeedback = [],
}: Props) {
  const pending = useJourneyPendingConfirmations({
    isOwner,
    viewerProfileId,
    initialCoAuthorInvites,
    initialCoSoStaffInvites,
    initialCongDongInvites,
  });

  if (!isOwner) return null;

  return (
    <div className="j-pending-confirmations" aria-label="Việc cần xác nhận">
      <JourneyDongGopFeedbackBanner items={initialDongGopFeedback} />
      <JourneyMembershipPendingBanner
        items={initialMembershipPending}
        ownerSlug={ownerSlug}
      />
      {pending.congDongInvites.length > 0 ? (
        <JourneyCongDongInviteBanner invites={pending.congDongInvites} />
      ) : null}
      {pending.coSoStaffInvites.length > 0 ? (
        <JourneyCoSoStaffInviteBanner invites={pending.coSoStaffInvites} />
      ) : null}
      {pending.coAuthorInvites.length > 0 ? (
        <JourneyCoAuthorPendingBanner
          invites={pending.coAuthorInvites}
          viewerProfileId={viewerProfileId}
          ownerSlug={ownerSlug}
          viewerName={ownerName}
          viewerAvatarUrl={ownerAvatarUrl}
        />
      ) : null}
      {pending.coAuthorReviews.length > 0 ? (
        <JourneyCoAuthorReviewBanner reviews={pending.coAuthorReviews} />
      ) : null}
      {pending.followRequests.length > 0 ? (
        <JourneyFollowRequestBanner requests={pending.followRequests} />
      ) : null}
    </div>
  );
}
