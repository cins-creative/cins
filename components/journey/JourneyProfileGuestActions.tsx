"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyProfileShareTrigger } from "@/components/journey/JourneyProfileShareTrigger";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import type { ChatPeerPreview } from "@/lib/chat/types";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
import type { useKetBanStatus } from "@/lib/social/use-ket-ban-status";

type KetBanState = ReturnType<typeof useKetBanStatus>;

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
  ketBan: KetBanState;
  chatPeerPreview: Omit<ChatPeerPreview, "userId">;
  shareProfile: JourneyShareProfile;
};

export function JourneyProfileGuestActions({
  targetUserId,
  viewerProfileId,
  ketBan,
  chatPeerPreview,
  shareProfile,
}: Props) {
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const isSelf = viewerProfileId === targetUserId;

  return (
    <div className="j-profile-action-stack">
      <button
        type="button"
        className="j-act-btn j-act-btn--primary"
        disabled={isSelf}
        onClick={() => {
          setError(null);
          void openChat({
            targetUserId,
            peerPreview: chatPeerPreview,
          }).catch((err: unknown) => {
            setError(
              err instanceof Error ? err.message : "Không mở được hội thoại.",
            );
          });
        }}
      >
        <Mail size={15} strokeWidth={2} aria-hidden />
        Nhắn tin
      </button>
      {error ? <p className="j-profile-action-error">{error}</p> : null}

      <div className="j-profile-action-row">
        <JourneyUserFollowButton
          targetUserId={targetUserId}
          viewerProfileId={viewerProfileId}
        />
        <JourneyFollowButton
          targetUserId={targetUserId}
          viewerProfileId={viewerProfileId}
          status={ketBan.status}
          ready={ketBan.ready}
          refreshStatus={ketBan.refresh}
        />
        <JourneyProfileShareTrigger
          shareProfile={shareProfile}
          viewerProfileId={viewerProfileId}
          variant="icon-row"
        />
      </div>
    </div>
  );
}
