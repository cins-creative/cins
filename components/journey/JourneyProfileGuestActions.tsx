"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyProfileShareTrigger } from "@/components/journey/JourneyProfileShareTrigger";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import type { ChatPeerPreview } from "@/lib/chat/types";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
import { useT } from "@/lib/i18n/use-t";
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
  const t = useT();
  const router = useRouter();
  const authGate = useOptionalAuthGate();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const isSelf = viewerProfileId === targetUserId;
  const showFollowButton = !isSelf && ketBan.quanHe !== "accepted";

  const requireAuth = useCallback(
    (message: string): boolean => {
      if (authGate?.isAuthenticated || viewerProfileId) return true;
      if (authGate) authGate.openAuthModal(message);
      else router.push("/login");
      return false;
    },
    [authGate, router, viewerProfileId],
  );

  const openMessage = () => {
    if (!requireAuth(t("social.authMessage"))) return;
    if (isSelf) return;

    setError(null);
    void openChat({
      targetUserId,
      tab: ketBan.quanHe === "accepted" ? "ban_be" : "nguoi_la",
      peerPreview: chatPeerPreview,
    }).catch((err: unknown) => {
      setError(
        err instanceof Error ? err.message : t("social.chatError"),
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
          title={t("social.message")}
          aria-label={t("social.message")}
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
        {showFollowButton ? (
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
