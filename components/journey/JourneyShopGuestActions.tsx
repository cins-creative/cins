"use client";

import { AlertTriangle, MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { ReportModal } from "@/components/social/ReportModal";
import { ShareLinkMenu } from "@/components/social/ShareLinkMenu";
import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import { shopEntryHref, shopPublicHref } from "@/lib/shop/cua-hang-href";
import { useKetBanStatus } from "@/lib/social/use-ket-ban-status";

const CHAT_AUTH_MESSAGE = "Đăng nhập để nhắn tin trên CINs.";
const REPORT_AUTH_MESSAGE = "Đăng nhập để báo cáo cửa hàng.";

type Props = {
  ownerId: string;
  ownerSlug: string;
  /** Segment URL cửa hàng — dùng khi share fallback. */
  shopSlug?: string | null;
  /** ID `shop_cua_hang` — đích báo cáo. */
  cuaHangId?: string | null;
  ownerName: string;
  ownerAvatarUrl: string | null;
  viewerProfileId: string | null;
  /** Tiêu đề khi chia sẻ — mặc định tên shop. */
  shareTitle?: string | null;
  /**
   * Path chia sẻ — mặc định URL trang hiện tại (loại hàng / storefront…).
   * Chỉ override khi cần share path khác pathname.
   */
  sharePath?: string | null;
};

/** CTA khách cạnh tên shop: nhắn tin · chia sẻ · báo cáo. */
export function JourneyShopGuestActions({
  ownerId,
  ownerSlug,
  shopSlug = null,
  cuaHangId = null,
  ownerName,
  ownerAvatarUrl,
  viewerProfileId,
  shareTitle = null,
  sharePath: sharePathProp = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const authGate = useOptionalAuthGate();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const ketBan = useKetBanStatus(ownerId, viewerProfileId);
  const isSelf = Boolean(viewerProfileId) && viewerProfileId === ownerId;
  const reportTargetId = cuaHangId?.trim() || null;
  const sharePath =
    sharePathProp?.trim() ||
    pathname?.trim() ||
    (shopSlug?.trim()
      ? shopPublicHref(ownerSlug, shopSlug.trim())
      : shopEntryHref(ownerSlug));
  const displayName = ownerName.trim() || ownerSlug;
  const shopTitle = shareTitle?.trim() || displayName;

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
    if (!requireAuth(CHAT_AUTH_MESSAGE)) return;
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

  const openReport = () => {
    if (!reportTargetId || isSelf) return;
    if (!requireAuth(REPORT_AUTH_MESSAGE)) return;
    setReportOpen(true);
  };

  return (
    <div className="j-shop-sf-guest-actions">
      <nav className="j-shop-sf-guest-row" aria-label="Thao tác cửa hàng">
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
        <ShareLinkMenu
          sharePath={sharePath}
          shareTitle={shopTitle}
          viewerLoggedIn={Boolean(viewerProfileId)}
          triggerClassName="j-shop-sf-guest-btn"
          triggerLabel="Chia sẻ"
          placement="down"
        />
        {reportTargetId && !isSelf ? (
          <button
            type="button"
            className="j-shop-sf-guest-btn is-report"
            title="Báo cáo cửa hàng"
            aria-label="Báo cáo cửa hàng"
            onClick={openReport}
          >
            <AlertTriangle size={17} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </nav>
      {error ? (
        <p className="j-shop-sf-guest-err" role="alert">
          {error}
        </p>
      ) : null}
      {reportTargetId ? (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetId={reportTargetId}
          targetTitle={shopTitle}
          loaiDoiTuong="shop_cua_hang"
          viewerLoggedIn={Boolean(viewerProfileId)}
        />
      ) : null}
    </div>
  );
}
