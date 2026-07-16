"use client";

import Link from "next/link";
import { Maximize2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import { useKetBanStatus } from "@/lib/social/use-ket-ban-status";
import type { MutualFriendProfile } from "@/lib/social/types";

type Props = {
  friend: MutualFriendProfile;
  viewerProfileId: string | null;
  /** Danh sách bạn bè của chính viewer — mọi card đã là bạn bè. */
  friendsAreMutual?: boolean;
};

export function JourneyFriendCardActions({
  friend,
  viewerProfileId,
  friendsAreMutual = false,
}: Props) {
  const router = useRouter();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const ketBan = useKetBanStatus(friend.idNguoiDung, viewerProfileId);
  const isSelf = viewerProfileId === friend.idNguoiDung;
  const isFriend =
    friendsAreMutual || ketBan.quanHe === "accepted";
  const showFollowButton = !isSelf && !isFriend;

  const openMessage = () => {
    if (!viewerProfileId) {
      router.push("/login");
      return;
    }
    if (isSelf) return;

    setError(null);
    void openChat({
      targetUserId: friend.idNguoiDung,
      tab:
        friendsAreMutual || ketBan.quanHe === "accepted"
          ? "ban_be"
          : "nguoi_la",
      peerPreview: {
        name: friend.tenHienThi,
        slug: friend.slug,
        role: friend.giaiDoan ?? undefined,
        avatarUrl: friend.avatarUrl,
        avatarInitial: avatarInitialFromName(friend.tenHienThi || friend.slug),
        avatarHue: avatarHueFromSeed(friend.idNguoiDung),
      },
    }).catch((err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Không mở được hội thoại.",
      );
    });
  };

  return (
    <div className="j-friend-actions">
      <div className="j-friend-actions-row j-friend-actions-row--icons">
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
              targetUserId={friend.idNguoiDung}
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
              targetUserId={friend.idNguoiDung}
              viewerProfileId={viewerProfileId}
            />
          </div>
        ) : null}
        <Link
          href={`/${friend.slug}`}
          className="j-friend-link is-icon"
          title="Xem Journey"
          aria-label="Xem Journey"
        >
          <Maximize2 size={17} strokeWidth={2} aria-hidden />
        </Link>
      </div>
      {error ? (
        <p className="j-friend-action-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
