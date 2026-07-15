"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const isSelf = viewerProfileId === targetUserId;

  const openMessage = () => {
    if (!viewerProfileId) {
      router.push("/login");
      return;
    }
    if (isSelf) return;

    setError(null);
    void openChat({
      targetUserId,
      tab: ketBan.quanHe === "accepted" ? "ban_be" : "nguoi_la",
      peerPreview: chatPeerPreview,
    }).catch((err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Không mở được hội thoại.",
      );
    });
  };

  return (
    <div className="j-profile-action-stack">
      <div className="j-profile-action-row j-profile-action-row--icons">
        <button
          type="button"
          className="j-friend-message is-icon"
          disabled={isSelf}
          title="Nhắn tin"
          aria-label="Nhắn tin"
          onClick={openMessage}
        >
          <MessageCircle size={17} strokeWidth={2} aria-hidden />
        </button>
        {!isSelf ? (
          <div className="j-friend-card-follow">
            <JourneyFollowButton
              compact
              targetUserId={targetUserId}
              viewerProfileId={viewerProfileId}
              status={ketBan.status}
              ready={ketBan.ready}
              refreshStatus={ketBan.refresh}
            />
          </div>
        ) : null}
        {!isSelf ? (
          <div className="j-friend-card-follow">
            <JourneyUserFollowButton
              compact
              targetUserId={targetUserId}
              viewerProfileId={viewerProfileId}
            />
          </div>
        ) : null}
        <JourneyProfileShareTrigger
          shareProfile={shareProfile}
          viewerProfileId={viewerProfileId}
          variant="icon-row"
        />
      </div>
      {error ? (
        <p className="j-profile-action-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
