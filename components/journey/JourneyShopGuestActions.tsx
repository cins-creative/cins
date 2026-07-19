"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { ShareLinkMenu } from "@/components/social/ShareLinkMenu";
import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import { shopPublicHref } from "@/lib/shop/cua-hang-href";
import { useKetBanStatus } from "@/lib/social/use-ket-ban-status";

type Props = {
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  viewerProfileId: string | null;
  /** Tiêu đề khi chia sẻ — mặc định tên shop. */
  shareTitle?: string | null;
};

/** CTA khách trên storefront: chia sẻ shop + nhắn tin chủ shop. */
export function JourneyShopGuestActions({
  ownerId,
  ownerSlug,
  ownerName,
  ownerAvatarUrl,
  viewerProfileId,
  shareTitle = null,
}: Props) {
  const router = useRouter();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const ketBan = useKetBanStatus(ownerId, viewerProfileId);
  const isSelf = Boolean(viewerProfileId) && viewerProfileId === ownerId;
  const sharePath = shopPublicHref(ownerSlug);
  const displayName = ownerName.trim() || ownerSlug;

  const openMessage = () => {
    if (!viewerProfileId) {
      router.push("/login");
      return;
    }
    if (isSelf) return;

    setError(null);
    void openChat({
      targetUserId: ownerId,
      tab: ketBan.quanHe === "accepted" ? "ban_be" : "nguoi_la",
      peerPreview: {
        name: displayName,
        slug: ownerSlug,
        avatarUrl: ownerAvatarUrl,
        avatarInitial: avatarInitialFromName(displayName),
        avatarHue: avatarHueFromSeed(ownerId),
      },
    }).catch((err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Không mở được hội thoại.",
      );
    });
  };

  return (
    <div className="j-shop-sf-guest-actions">
      <nav
        className="j-shop-sf-guest-row"
        aria-label="Thao tác cửa hàng"
      >
        <ShareLinkMenu
          sharePath={sharePath}
          shareTitle={shareTitle?.trim() || displayName}
          viewerLoggedIn={Boolean(viewerProfileId)}
          triggerClassName="j-shop-sf-guest-btn"
          triggerLabel="Chia sẻ"
          placement="down"
        />
        <button
          type="button"
          className="j-shop-sf-guest-btn"
          disabled={isSelf}
          title="Nhắn tin"
          aria-label="Nhắn tin"
          onClick={openMessage}
        >
          <MessageCircle size={17} strokeWidth={2} aria-hidden />
        </button>
      </nav>
      {error ? (
        <p className="j-shop-sf-guest-err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
