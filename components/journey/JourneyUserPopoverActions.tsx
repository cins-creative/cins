"use client";

import Link from "next/link";
import { MessageCircle, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import { useKetBanStatus } from "@/lib/social/use-ket-ban-status";

type PopoverUser = {
  idNguoiDung: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  giaiDoan: string | null;
};

type Props = {
  user: PopoverUser;
  viewerProfileId: string | null;
  onClose?: () => void;
};

export function JourneyUserPopoverActions({
  user,
  viewerProfileId,
  onClose,
}: Props) {
  const router = useRouter();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const ketBan = useKetBanStatus(user.idNguoiDung, viewerProfileId);
  const isSelf = viewerProfileId === user.idNguoiDung;

  const openMessage = () => {
    if (!viewerProfileId) {
      router.push("/login");
      return;
    }
    if (isSelf) return;

    setError(null);
    void openChat({
      targetUserId: user.idNguoiDung,
      tab:
        ketBan.quanHe === "accepted" ? "ban_be" : "nguoi_la",
      peerPreview: {
        name: user.tenHienThi,
        slug: user.slug,
        role: user.giaiDoan ?? undefined,
        avatarUrl: user.avatarUrl,
        avatarInitial: avatarInitialFromName(user.tenHienThi || user.slug),
        avatarHue: avatarHueFromSeed(user.idNguoiDung),
      },
    })
      .then(() => onClose?.())
      .catch((err: unknown) => {
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
              targetUserId={user.idNguoiDung}
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
              targetUserId={user.idNguoiDung}
              viewerProfileId={viewerProfileId}
            />
          </div>
        ) : null}
        <Link
          href={`/${user.slug}`}
          className="j-friend-link is-icon"
          title="Xem Journey"
          aria-label="Xem Journey"
          onClick={() => onClose?.()}
        >
          <UserRound size={17} strokeWidth={2} aria-hidden />
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
