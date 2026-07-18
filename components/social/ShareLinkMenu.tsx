"use client";

import { ChevronLeft, Copy, MessageCircle, Share2 } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { SharePostToFriendsPanel } from "@/components/social/SharePostToFriendsPanel";
import {
  buildSocialShareItems,
  copyTextToClipboard,
  openFacebookShare,
} from "@/lib/journey/profile-share";

import "./share-link-menu.css";

type Panel = "share" | "friends";

type Props = {
  /** Path nội bộ — vd. `/slug` hoặc `/slug/p/post`. */
  sharePath: string;
  shareTitle?: string | null;
  viewerLoggedIn: boolean;
  /** Class nút trigger (mặc định icon friend-row). */
  triggerClassName?: string;
  triggerLabel?: string;
  triggerIcon?: ReactNode;
  /** Popover mở lên trên (popover user) hay xuống dưới. */
  placement?: "up" | "down";
  className?: string;
  onCloseParent?: () => void;
};

type PopPos = { top: number; left: number; width: number };

function absoluteShareUrl(sharePath: string): string {
  const path = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/**
 * Menu chia sẻ entity (Journey / bài…) — gửi bạn bè + copy + MXH.
 * Cùng luồng với panel Chia sẻ trong JourneyMilestoneViewerMenu.
 */
export function ShareLinkMenu({
  sharePath,
  shareTitle,
  viewerLoggedIn,
  triggerClassName = "j-friend-link is-icon",
  triggerLabel = "Chia sẻ",
  triggerIcon,
  placement = "up",
  className,
  onCloseParent,
}: Props) {
  const authGate = useOptionalAuthGate();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("share");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pos, setPos] = useState<PopPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setOpen(false);
    setPanel("share");
    setFlash(null);
    setPos(null);
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function place() {
      const btn = triggerRef.current;
      const menu = menuRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuW = menu?.offsetWidth || (panel === "friends" ? 300 : 260);
      const menuH = menu?.offsetHeight || 200;
      const gap = 6;
      const pad = 8;

      let left = rect.right - menuW;
      left = Math.max(pad, Math.min(left, window.innerWidth - menuW - pad));

      let top: number;
      if (placement === "up") {
        top = rect.top - menuH - gap;
        if (top < pad) top = rect.bottom + gap;
      } else {
        top = rect.bottom + gap;
        if (top + menuH > window.innerHeight - pad) {
          top = Math.max(pad, rect.top - menuH - gap);
        }
      }
      top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));

      setPos({ top, left, width: menuW });
    }

    place();
    const raf = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, panel, placement]);

  useEffect(() => {
    if (!open) return;
    let removeListeners: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      const onDocPointerDown = (e: PointerEvent) => {
        const t = e.target as Node;
        if (rootRef.current?.contains(t)) return;
        if (menuRef.current?.contains(t)) return;
        closeMenu();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (panel === "friends") setPanel("share");
        else closeMenu();
      };
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

  const shareUrl = absoluteShareUrl(sharePath);
  const title = shareTitle?.trim() || "CINs";

  async function copyLink() {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      return;
    }
    window.prompt("Sao chép URL:", shareUrl);
  }

  async function nativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({ title, url: shareUrl });
      closeMenu();
      onCloseParent?.();
    } catch {
      /* huỷ */
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

  const shareItems = open
    ? buildSocialShareItems(shareUrl, title, {
        onNativeShare: () => void nativeShare(),
        onCopy: () => void copyLink(),
        onFacebookShare: () => void openFacebookShare(shareUrl, title),
      }).map((item) =>
        item.id === "copy"
          ? { ...item, label: copied ? "Đã sao chép link!" : "Sao chép link" }
          : item,
      )
    : [];

  const popStyle: CSSProperties | undefined = pos
    ? {
        position: "fixed",
        top: pos.top,
        left: pos.left,
        right: "auto",
        bottom: "auto",
        width: pos.width,
        zIndex: 9800,
      }
    : {
        position: "fixed",
        visibility: "hidden",
        top: 0,
        left: 0,
        zIndex: 9800,
      };

  const menuPop =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className={
              "j-m-menu-pop j-share-link-menu-pop is-portal" +
              (panel === "friends" ? " j-m-menu-pop--friends" : "")
            }
            role="menu"
            style={popStyle}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {panel === "friends" ? (
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
                <SharePostToFriendsPanel
                  shareUrl={shareUrl}
                  shareTitle={shareTitle}
                  onDone={(message) => {
                    setFlash(message);
                    window.setTimeout(() => {
                      closeMenu();
                      onCloseParent?.();
                    }, 900);
                  }}
                />
              </>
            ) : (
              <>
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
                  <span className="j-m-menu-lbl">Gửi bạn bè</span>
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
                      onClick={() => {
                        closeMenu();
                        onCloseParent?.();
                      }}
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
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={
        "j-share-link-menu" +
        (placement === "up" ? " j-share-link-menu--up" : "") +
        (className ? ` ${className}` : "")
      }
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (open) closeMenu();
          else {
            setPanel("share");
            setFlash(null);
            setOpen(true);
          }
        }}
      >
        {triggerIcon ?? <Share2 size={17} strokeWidth={2} aria-hidden />}
      </button>
      {menuPop}
    </div>
  );
}
