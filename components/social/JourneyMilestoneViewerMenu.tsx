"use client";

import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  ExternalLink,
  MessageCircle,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { ReportModal } from "@/components/social/ReportModal";
import { SharePostToFriendsPanel } from "@/components/social/SharePostToFriendsPanel";
import {
  buildSocialShareItems,
  copyTextToClipboard,
  openFacebookShare,
} from "@/lib/journey/profile-share";

type Props = {
  /** ID nội dung để báo cáo (cột mốc). */
  reportTargetId: string;
  reportTargetTitle?: string | null;
  /** Permalink bài viết (mở trang riêng / copy / share). Null nếu không có bài. */
  postHref?: string | null;
  viewerLoggedIn: boolean;
  className?: string;
};

type MenuPanel = "main" | "share" | "friends";

const MOBILE_MQ = "(max-width: 640px)";

/** Menu "..." cho người xem nội dung của người khác: mở, chia sẻ, báo cáo. */
export function JourneyMilestoneViewerMenu({
  reportTargetId,
  reportTargetTitle,
  postHref,
  viewerLoggedIn,
  className,
}: Props) {
  const authGate = useOptionalAuthGate();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<MenuPanel>("main");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const friendsSheetRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setOpen(false);
    setPanel("main");
    setFlash(null);
  }

  useEffect(() => {
    setPortalReady(true);
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setMobileOverlay(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    let removeListeners: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      const onDocPointerDown = (e: PointerEvent) => {
        const t = e.target as Node;
        if (rootRef.current?.contains(t)) return;
        if (friendsSheetRef.current?.contains(t)) return;
        closeMenu();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (panel === "friends") setPanel("share");
        else if (panel === "share") setPanel("main");
        else closeMenu();
      };
      /* Capture: tránh bị parent stopPropagation (mousedown bubble) giữ menu mở. */
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onKey);
      removeListeners = () => {
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        document.removeEventListener("keydown", onKey);
      };
    }, 0);
    return () => {
      window.clearTimeout(timer);
      removeListeners?.();
    };
  }, [open, panel]);

  function absoluteHref(): string | null {
    if (!postHref) return null;
    const path = postHref.startsWith("/") ? postHref : `/${postHref}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  async function copyLink() {
    const full = absoluteHref();
    if (!full) return;
    const ok = await copyTextToClipboard(full);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      return;
    }
    window.prompt("Sao chép URL bài viết:", full);
  }

  async function nativeShare() {
    const full = absoluteHref();
    if (!full || typeof navigator === "undefined" || !navigator.share) return;
    try {
      /* Gọi share trước khi đóng menu — giữ user gesture trên desktop. */
      await navigator.share({
        title: reportTargetTitle ?? "Bài viết trên CINs",
        url: full,
      });
      closeMenu();
    } catch {
      /* User huỷ hoặc OS từ chối — giữ panel mở. */
    }
  }

  function openFriendsPanel() {
    const go = () => {
      setFlash(null);
      setPanel("friends");
    };
    if (!viewerLoggedIn) {
      if (authGate) {
        authGate.requireAuth(go);
        return;
      }
      window.location.href = "/login";
      return;
    }
    go();
  }

  const shareTitle = reportTargetTitle?.trim() || "Bài viết trên CINs";
  const shareUrl = absoluteHref() ?? "";
  const shareItems =
    shareUrl && panel === "share"
      ? buildSocialShareItems(shareUrl, shareTitle, {
          onNativeShare: () => void nativeShare(),
          onCopy: () => void copyLink(),
          onFacebookShare: () => void openFacebookShare(shareUrl, shareTitle),
        }).map((item) =>
          item.id === "copy"
            ? { ...item, label: copied ? "Đã sao chép link!" : "Sao chép link" }
            : item,
        )
      : [];

  const friendsBody: ReactNode =
    panel === "friends" ? (
      <>
        <button
          type="button"
          className="j-m-menu-item"
          role="menuitem"
          onClick={() => {
            setFlash(null);
            setPanel("share");
          }}
        >
          <span className="j-m-menu-ico" aria-hidden>
            <ChevronLeft size={14} strokeWidth={1.7} />
          </span>
          <span className="j-m-menu-lbl">Quay lại</span>
        </button>
        <div className="j-m-menu-sep" aria-hidden />
        {flash ? (
          <p className="j-m-share-friends-flash" role="status">
            {flash}
          </p>
        ) : null}
        {shareUrl ? (
          <SharePostToFriendsPanel
            shareUrl={shareUrl}
            shareTitle={reportTargetTitle}
            onDone={(message) => {
              setFlash(message);
              window.setTimeout(() => closeMenu(), 900);
            }}
          />
        ) : null}
      </>
    ) : null;

  const friendsOverlay =
    open &&
    panel === "friends" &&
    mobileOverlay &&
    portalReady &&
    typeof document !== "undefined"
      ? createPortal(
          <div className="j-m-share-friends-overlay" role="presentation">
            <button
              type="button"
              className="j-m-share-friends-overlay-backdrop"
              aria-label="Đóng"
              onClick={closeMenu}
            />
            <div
              ref={friendsSheetRef}
              className="j-m-share-friends-overlay-sheet"
              role="menu"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {friendsBody}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={className ? `j-m-menu ${className}` : "j-m-menu"}
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="j-m-menu-btn"
        aria-label="Mở menu bài viết"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (open) closeMenu();
          else {
            setPanel("main");
            setFlash(null);
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden />
      </button>

      {open && !(panel === "friends" && mobileOverlay) ? (
        <div
          className={
            "j-m-menu-pop" +
            (panel === "friends" ? " j-m-menu-pop--friends" : "")
          }
          role="menu"
        >
          {panel === "friends" ? (
            friendsBody
          ) : panel === "share" ? (
            <>
              <button
                type="button"
                className="j-m-menu-item"
                role="menuitem"
                onClick={() => setPanel("main")}
              >
                <span className="j-m-menu-ico" aria-hidden>
                  <ChevronLeft size={14} strokeWidth={1.7} />
                </span>
                <span className="j-m-menu-lbl">Quay lại</span>
              </button>
              <div className="j-m-menu-sep" aria-hidden />

              <button
                type="button"
                className="j-m-menu-item j-m-share-item"
                role="menuitem"
                onClick={openFriendsPanel}
              >
                <span
                  className="j-share-soc-ic j-m-share-ic j-share-soc-ic--invite"
                  aria-hidden
                >
                  <MessageCircle size={12} strokeWidth={2.2} />
                </span>
                <span className="j-m-menu-lbl">Gửi bạn bè, nhóm, tổ chức</span>
              </button>

              <div className="j-m-menu-sep" aria-hidden />

              {shareItems.map((item) =>
                item.href ? (
                  <a
                    key={item.id}
                    href={item.href}
                    className="j-m-menu-item j-m-share-item"
                    role="menuitem"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => closeMenu()}
                  >
                    <span
                      className={`j-share-soc-ic j-m-share-ic ${item.iconClass}`}
                      aria-hidden
                    >
                      {item.iconLabel}
                    </span>
                    <span className="j-m-menu-lbl">{item.label}</span>
                  </a>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    className="j-m-menu-item j-m-share-item"
                    role="menuitem"
                    onClick={() => item.onClick?.()}
                  >
                    <span
                      className={`j-share-soc-ic j-m-share-ic ${item.iconClass}`}
                      aria-hidden
                    >
                      {item.id === "copy" ? (
                        <Copy size={12} strokeWidth={2.2} />
                      ) : (
                        item.iconLabel
                      )}
                    </span>
                    <span className="j-m-menu-lbl">{item.label}</span>
                  </button>
                ),
              )}
            </>
          ) : (
            <>
              {postHref ? (
                <a
                  href={postHref}
                  className="j-m-menu-item"
                  role="menuitem"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => closeMenu()}
                >
                  <span className="j-m-menu-ico" aria-hidden>
                    <ExternalLink size={14} strokeWidth={1.7} />
                  </span>
                  <span className="j-m-menu-lbl">Mở bài viết</span>
                </a>
              ) : null}

              {postHref ? (
                <button
                  type="button"
                  className="j-m-menu-item"
                  role="menuitem"
                  onClick={() => setPanel("share")}
                >
                  <span className="j-m-menu-ico" aria-hidden>
                    <Share2 size={14} strokeWidth={1.7} />
                  </span>
                  <span className="j-m-menu-lbl">Chia sẻ</span>
                </button>
              ) : null}

              <div className="j-m-menu-sep" aria-hidden />

              <button
                type="button"
                className="j-m-menu-item is-danger"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  setReportOpen(true);
                }}
              >
                <span className="j-m-menu-ico" aria-hidden>
                  <AlertTriangle size={14} strokeWidth={1.7} />
                </span>
                <span className="j-m-menu-lbl">Báo cáo</span>
              </button>
            </>
          )}
        </div>
      ) : null}

      {friendsOverlay}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={reportTargetId}
        targetTitle={reportTargetTitle}
        viewerLoggedIn={viewerLoggedIn}
      />
    </div>
  );
}
