"use client";

import { AlertTriangle, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { ReportModal } from "@/components/social/ReportModal";
import { ShareLinkMenu } from "@/components/social/ShareLinkMenu";
import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import { shopEntryHref, shopPublicHref } from "@/lib/shop/cua-hang-href";
import { useT } from "@/lib/i18n/use-t";
import { useKetBanStatus } from "@/lib/social/use-ket-ban-status";
import {
  collectScrollResizeTargets,
  computeFixedMenuPosition,
} from "@/lib/ui/clamp-fixed-menu-position";

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

const MORE_MENU_W = 220;

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
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const authGate = useOptionalAuthGate();
  const { openChat } = useCinsChat();
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
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

  const closeMore = useCallback(() => {
    setMoreOpen(false);
    setMenuStyle(null);
  }, []);

  const openMessage = () => {
    if (!requireAuth(t("social.authMessage"))) return;
    if (isSelf) return;

    closeMore();
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
        err instanceof Error ? err.message : t("shop.chatOpenFail"),
      );
    });
  };

  const openReport = () => {
    if (!reportTargetId || isSelf) return;
    if (!requireAuth(t("shop.authReport"))) return;
    closeMore();
    setReportOpen(true);
  };

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!moreOpen) return;
    const place = () => {
      const btn = moreBtnRef.current;
      const menu = moreMenuRef.current;
      if (!btn) return;
      const pos = computeFixedMenuPosition(btn.getBoundingClientRect(), {
        width: menu?.offsetWidth || MORE_MENU_W,
        height: menu?.offsetHeight || 140,
      });
      setMenuStyle({
        position: "fixed",
        top: pos.top,
        left: pos.left,
        right: "auto",
        bottom: "auto",
        zIndex: 11000,
      });
    };
    place();
    const raf = window.requestAnimationFrame(place);
    const targets = collectScrollResizeTargets(moreBtnRef.current);
    for (const el of targets) {
      el.addEventListener("scroll", place, { passive: true });
    }
    window.addEventListener("resize", place);
    return () => {
      window.cancelAnimationFrame(raf);
      for (const el of targets) el.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: PointerEvent) => {
      const node = e.target as Node | null;
      if (!node) return;
      if (moreBtnRef.current?.contains(node)) return;
      if (moreMenuRef.current?.contains(node)) return;
      if (node instanceof Element) {
        if (node.closest(".j-share-link-menu-pop")) return;
        if (node.closest(".j-m-share-friends-overlay")) return;
      }
      closeMore();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMore();
    };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen, closeMore]);

  const shareMenu = (opts: {
    triggerClassName: string;
    triggerContent?: ReactNode;
    onCloseParent?: () => void;
  }) => (
    <ShareLinkMenu
      sharePath={sharePath}
      shareTitle={shopTitle}
      viewerLoggedIn={Boolean(viewerProfileId)}
      triggerClassName={opts.triggerClassName}
      triggerLabel={t("shop.share")}
      placement="down"
      triggerContent={opts.triggerContent}
      onCloseParent={opts.onCloseParent}
    />
  );

  const morePop =
    moreOpen && portalReady && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={moreMenuRef}
            className="j-m-menu-pop is-portal j-shop-sf-guest-more-pop"
            role="menu"
            style={
              menuStyle ?? {
                position: "fixed",
                visibility: "hidden",
                top: 0,
                left: 0,
                zIndex: 11000,
              }
            }
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="j-m-menu-item"
              role="menuitem"
              disabled={isSelf}
              onClick={openMessage}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <MessageCircle size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">{t("shop.message")}</span>
            </button>
            {shareMenu({
              triggerClassName: "j-m-menu-item",
              onCloseParent: closeMore,
              triggerContent: (
                <>
                  <span className="j-m-menu-ico" aria-hidden>
                    <Share2 size={14} strokeWidth={1.7} />
                  </span>
                  <span className="j-m-menu-lbl">{t("shop.share")}</span>
                </>
              ),
            })}
            {reportTargetId && !isSelf ? (
              <button
                type="button"
                className="j-m-menu-item is-danger"
                role="menuitem"
                onClick={openReport}
              >
                <span className="j-m-menu-ico" aria-hidden>
                  <AlertTriangle size={14} strokeWidth={1.7} />
                </span>
                <span className="j-m-menu-lbl">{t("shop.report")}</span>
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="j-shop-sf-guest-actions">
      <nav className="j-shop-sf-guest-row is-icons" aria-label={t("shop.actionsAria")}>
        <button
          type="button"
          className="j-shop-sf-guest-btn"
          disabled={isSelf}
          title={t("shop.message")}
          aria-label={t("shop.message")}
          onClick={openMessage}
        >
          <MessageCircle size={17} strokeWidth={2} aria-hidden />
        </button>
        {shareMenu({ triggerClassName: "j-shop-sf-guest-btn" })}
        {reportTargetId && !isSelf ? (
          <button
            type="button"
            className="j-shop-sf-guest-btn is-report"
            title={t("shop.report")}
            aria-label={t("shop.report")}
            onClick={openReport}
          >
            <AlertTriangle size={17} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </nav>

      <div className="j-shop-sf-guest-more">
        <button
          ref={moreBtnRef}
          type="button"
          className="j-shop-sf-guest-btn"
          title={t("shop.moreActions")}
          aria-label={t("shop.moreActions")}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <MoreHorizontal size={18} strokeWidth={2} aria-hidden />
        </button>
        {morePop}
      </div>

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
