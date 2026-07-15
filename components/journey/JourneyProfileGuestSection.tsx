"use client";

import { JourneyProfileGuestActions } from "@/components/journey/JourneyProfileGuestActions";
import type { ChatPeerPreview } from "@/lib/chat/types";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
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
  const ketBan = useKetBanStatus(targetUserId, viewerProfileId, initialKetBanStatus);

  return (
    <JourneyProfileGuestActions
      targetUserId={targetUserId}
      viewerProfileId={viewerProfileId}
      ketBan={ketBan}
      chatPeerPreview={chatPeerPreview}
      shareProfile={shareProfile}
    />
  );
}
