"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
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
      <div className="j-friend-actions-row">
        <button
          type="button"
          className="j-friend-message"
          disabled={isSelf}
          onClick={openMessage}
        >
          Nhắn tin
        </button>
        <div className="j-friend-card-follow">
          <JourneyUserFollowButton
            compact
            targetUserId={user.idNguoiDung}
            viewerProfileId={viewerProfileId}
          />
        </div>
      </div>
      {error ? (
        <p className="j-friend-action-error" role="alert">
          {error}
        </p>
      ) : null}
      <Link
        href={`/${user.slug}`}
        className="j-friend-link"
        onClick={() => onClose?.()}
      >
        Xem Journey
      </Link>
    </div>
  );
}
