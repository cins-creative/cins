"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
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
  const showFriendBtn =
    Boolean(viewerProfileId) &&
    !isSelf &&
    !friendsAreMutual &&
    ketBan.quanHe !== "accepted" &&
    ketBan.quanHe !== "blocked";

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
      <div className="j-friend-actions-row">
        <button
          type="button"
          className="j-friend-message"
          disabled={isSelf}
          onClick={openMessage}
        >
          Nhắn tin
        </button>
        {showFriendBtn ? (
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
      </div>
      {error ? (
        <p className="j-friend-action-error" role="alert">
          {error}
        </p>
      ) : null}
      <Link href={`/${friend.slug}`} className="j-friend-link">
        Xem Journey
      </Link>
    </div>
  );
}
