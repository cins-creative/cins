"use client";

import { Mail, Share2 } from "lucide-react";

import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import type { MutualFriendsState } from "@/lib/social/use-mutual-friends";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
  mutual: MutualFriendsState;
};

export function JourneyProfileGuestActions({
  targetUserId,
  viewerProfileId,
  mutual,
}: Props) {
  return (
    <div className="j-profile-action-stack">
      <button type="button" className="j-act-btn j-act-btn--primary" disabled>
        <Mail size={15} strokeWidth={2} aria-hidden />
        Nhắn tin
      </button>

      <div className="j-profile-action-row">
        <JourneyUserFollowButton
          targetUserId={targetUserId}
          viewerProfileId={viewerProfileId}
        />
        <JourneyFollowButton
          targetUserId={targetUserId}
          viewerProfileId={viewerProfileId}
          mutual={mutual}
        />
        <button
          type="button"
          className="j-act-btn j-act-btn--icon"
          title="Chia sẻ"
          disabled
          aria-label="Chia sẻ"
        >
          <Share2 size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
