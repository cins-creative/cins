"use client";

import Link from "next/link";
import { Maximize2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneyUserFollowButton } from "@/components/journey/JourneyUserFollowButton";
import { ShareLinkMenu } from "@/components/social/ShareLinkMenu";
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
  /** Gợi ý người lạ — không hiện nhắn tin. */
  showMessage?: boolean;
};

/** Khung icon CTA — hiện ngay khi card mở, trước khi có id user. */
export function JourneyUserPopoverActionsShell() {
  return (
    <div className="j-friend-actions" aria-hidden>
      <div className="j-friend-actions-row j-friend-actions-row--icons">
        <span className="j-friend-message is-icon is-skel" />
        <span className="j-friend-card-follow">
          <span className="j-friend-btn is-compact is-skel" />
        </span>
        <span className="j-friend-card-follow">
          <span className="j-friend-btn is-compact is-skel" />
        </span>
        <span className="j-friend-link is-icon is-skel" />
        <span className="j-friend-link is-icon is-skel" />
      </div>
    </div>
  );
}

export function JourneyUserPopoverActions({
  user,
  viewerProfileId,
  onClose,
  showMessage = true,
}: Props) {
  const router = useRouter();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const ketBan = useKetBanStatus(user.idNguoiDung, viewerProfileId);
  const isSelf =
    Boolean(user.idNguoiDung) && viewerProfileId === user.idNguoiDung;
  const showFollowButton =
    Boolean(user.idNguoiDung) && !isSelf && ketBan.quanHe !== "accepted";
  const sharePath = user.slug ? `/${user.slug}` : "";

  const openMessage = () => {
    if (!viewerProfileId) {
      router.push("/login");
      return;
    }
    if (!user.idNguoiDung || isSelf) return;

    setError(null);
    void openChat({
      targetUserId: user.idNguoiDung,
      tab: ketBan.quanHe === "accepted" ? "ban_be" : "nguoi_la",
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
        {showMessage ? (
          <button
            type="button"
            className="j-friend-message is-icon"
            disabled={isSelf || !user.idNguoiDung}
            title="Nhắn tin"
            aria-label="Nhắn tin"
            onClick={openMessage}
          >
            <MessageCircle size={17} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        {user.idNguoiDung && !isSelf ? (
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
        {showFollowButton ? (
          <div className="j-friend-card-follow">
            <JourneyUserFollowButton
              compact
              targetUserId={user.idNguoiDung}
              viewerProfileId={viewerProfileId}
            />
          </div>
        ) : null}
        {sharePath ? (
          <ShareLinkMenu
            sharePath={sharePath}
            shareTitle={user.tenHienThi || user.slug}
            viewerLoggedIn={Boolean(viewerProfileId)}
            triggerClassName="j-friend-link is-icon"
            triggerLabel="Chia sẻ"
            placement="up"
            onCloseParent={onClose}
          />
        ) : null}
        <Link
          href={`/${user.slug}`}
          className="j-friend-link is-icon"
          title="Xem Journey"
          aria-label="Xem Journey"
          onClick={() => onClose?.()}
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
