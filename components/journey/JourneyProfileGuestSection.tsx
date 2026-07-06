"use client";

import { JourneyMutualFriendsTrigger } from "@/components/journey/JourneyMutualFriendsTrigger";
import { JourneyProfileGuestActions } from "@/components/journey/JourneyProfileGuestActions";
import type { ChatPeerPreview } from "@/lib/chat/types";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
import { useMutualFriends } from "@/lib/social/use-mutual-friends";
import { useKetBanStatus } from "@/lib/social/use-ket-ban-status";
import type { KetBanStatusSummary } from "@/lib/social/types";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
  initialKetBanStatus?: KetBanStatusSummary | null;
  chatPeerPreview: Omit<ChatPeerPreview, "userId">;
  shareProfile: JourneyShareProfile;
};

export function JourneyProfileGuestSection({
  targetUserId,
  viewerProfileId,
  initialKetBanStatus = null,
  chatPeerPreview,
  shareProfile,
}: Props) {
  const mutual = useMutualFriends(targetUserId, viewerProfileId);
  const ketBan = useKetBanStatus(targetUserId, viewerProfileId, initialKetBanStatus);

  const showMutualLine = mutual.visible && ketBan.quanHe !== "accepted";

  return (
    <>
      {showMutualLine ? (
        <JourneyMutualFriendsTrigger mutual={mutual} variant="line" />
      ) : null}
      <JourneyProfileGuestActions
        targetUserId={targetUserId}
        viewerProfileId={viewerProfileId}
        ketBan={ketBan}
        chatPeerPreview={chatPeerPreview}
        shareProfile={shareProfile}
      />
    </>
  );
}
