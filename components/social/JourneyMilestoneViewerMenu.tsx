"use client";

import {
  AlertTriangle,
  ExternalLink,
  Link2,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ReportModal } from "@/components/social/ReportModal";

type Props = {
  /** ID nội dung để báo cáo (cột mốc). */
  reportTargetId: string;
  reportTargetTitle?: string | null;
  /** Permalink bài viết (mở trang riêng / copy / share). Null nếu không có bài. */
  postHref?: string | null;
  viewerLoggedIn: boolean;
  className?: string;
};

/** Menu "..." cho người xem nội dung của người khác: mở, chia sẻ, copy, báo cáo. */
export function JourneyMilestoneViewerMenu({
  reportTargetId,
  reportTargetTitle,
  postHref,
  viewerLoggedIn,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let removeListeners: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      const onDocPointerDown = (e: PointerEvent) => {
        if (rootRef.current?.contains(e.target as Node)) return;
        setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
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
  }, [open]);

  function absoluteHref(): string | null {
    if (!postHref) return null;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return base ? `${base}${postHref}` : postHref;
  }

  function copyLink() {
    const full = absoluteHref();
    if (!full) return;
    try {
      navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Sao chép URL bài viết:", full);
    }
  }

  async function share() {
    const full = absoluteHref();
    if (!full) return;
    setOpen(false);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: reportTargetTitle ?? "Bài viết trên CINs",
          url: full,
        });
        return;
      } catch {
        /* user huỷ share — bỏ qua */
      }
    }
    copyLink();
  }

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
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div className="j-m-menu-pop" role="menu">
          {postHref ? (
            <a
              href={postHref}
              className="j-m-menu-item"
              role="menuitem"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
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
              onClick={share}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Share2 size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Chia sẻ</span>
            </button>
          ) : null}

          {postHref ? (
            <button
              type="button"
              className="j-m-menu-item"
              role="menuitem"
              onClick={copyLink}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Link2 size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">
                {copied ? "Đã sao chép link!" : "Sao chép link"}
              </span>
            </button>
          ) : null}

          <div className="j-m-menu-sep" aria-hidden />

          <button
            type="button"
            className="j-m-menu-item is-danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setReportOpen(true);
            }}
          >
            <span className="j-m-menu-ico" aria-hidden>
              <AlertTriangle size={14} strokeWidth={1.7} />
            </span>
            <span className="j-m-menu-lbl">Báo cáo</span>
          </button>
        </div>
      ) : null}

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
