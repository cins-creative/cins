"use client";

import { Mail, Share2 } from "lucide-react";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import type { ChatPeerPreview } from "@/lib/chat/types";
import type { useKetBanStatus } from "@/lib/social/use-ket-ban-status";

type KetBanState = ReturnType<typeof useKetBanStatus>;

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
  ketBan: KetBanState;
  chatPeerPreview: Omit<ChatPeerPreview, "userId">;
};

export function JourneyProfileGuestActions({
  targetUserId,
  viewerProfileId,
  ketBan,
  chatPeerPreview,
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
          compact
        />
        <JourneyFollowButton
          targetUserId={targetUserId}
          viewerProfileId={viewerProfileId}
          status={ketBan.status}
          ready={ketBan.ready}
          refreshStatus={ketBan.refresh}
          compact
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
