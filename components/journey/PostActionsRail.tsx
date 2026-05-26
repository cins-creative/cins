"use client";

import {
  Bookmark,
  BookmarkCheck,
  Heart,
  Link2,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ PostActionsRail — thanh hành động dạng dock ở cạnh phải bài viết. ║
   ║                                                                  ║
   ║ Items:                                                            ║
   ║   • Thích   — heart toggle (UI optimistic; persist sau)          ║
   ║   • Lưu     — bookmark toggle (UI optimistic; persist sau)       ║
   ║   • Chia sẻ — popover với: Copy link, Facebook, X, Pinterest     ║
   ║                                                                  ║
   ║ State backend (like / bookmark) sẽ wire vào bảng `social_*`     ║
   ║ ở lượt sau. Hiện chỉ giữ state client để demo + UX feedback.    ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Props = {
  /** URL absolute của bài viết (truyền từ parent để share). */
  shareUrl: string;
  /** Tiêu đề bài viết — dùng cho intent của FB/X/Pinterest. */
  title: string;
  /** Ảnh cover (URL hoặc seed pre-built) — dùng cho Pinterest pin. */
  coverImageUrl?: string | null;
};

export function PostActionsRail({ shareUrl, title, coverImageUrl }: Props) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareWrapRef = useRef<HTMLDivElement | null>(null);

  /* Đóng popover share khi click ra ngoài. */
  useEffect(() => {
    if (!shareOpen) return;
    function onDoc(e: MouseEvent) {
      const node = shareWrapRef.current;
      if (node && !node.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [shareOpen]);

  function copyLink() {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Sao chép URL bài viết:", shareUrl);
    }
  }

  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl,
  )}`;
  const xHref = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    shareUrl,
  )}&text=${encodeURIComponent(title)}`;
  const pinHref = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
    shareUrl,
  )}&description=${encodeURIComponent(title)}${
    coverImageUrl
      ? `&media=${encodeURIComponent(coverImageUrl)}`
      : ""
  }`;

  return (
    <aside className="post-rail" aria-label="Hành động bài viết">
      <button
        type="button"
        className={`post-rail-btn ${liked ? "is-active is-like" : ""}`}
        onClick={() => setLiked((v) => !v)}
        aria-pressed={liked}
        aria-label={liked ? "Bỏ thích" : "Thích"}
      >
        <Heart
          size={20}
          strokeWidth={1.7}
          fill={liked ? "currentColor" : "none"}
          aria-hidden
        />
        <span className="post-rail-lbl">Thích</span>
      </button>

      <button
        type="button"
        className={`post-rail-btn ${bookmarked ? "is-active is-bookmark" : ""}`}
        onClick={() => setBookmarked((v) => !v)}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Bỏ lưu" : "Lưu"}
      >
        {bookmarked ? (
          <BookmarkCheck size={20} strokeWidth={1.7} aria-hidden />
        ) : (
          <Bookmark size={20} strokeWidth={1.7} aria-hidden />
        )}
        <span className="post-rail-lbl">Lưu</span>
      </button>

      <div className="post-rail-share-wrap" ref={shareWrapRef}>
        <button
          type="button"
          className={`post-rail-btn ${shareOpen ? "is-active" : ""}`}
          onClick={() => setShareOpen((v) => !v)}
          aria-expanded={shareOpen}
          aria-haspopup="menu"
          aria-label="Chia sẻ"
        >
          <Share2 size={20} strokeWidth={1.7} aria-hidden />
          <span className="post-rail-lbl">Chia sẻ</span>
        </button>

        {shareOpen ? (
          <div className="post-rail-share" role="menu">
            <button
              type="button"
              className="post-rail-share-item"
              onClick={() => {
                copyLink();
                setShareOpen(false);
              }}
            >
              <span className="post-rail-share-ic post-rail-share-ic--copy">
                <Link2 size={16} strokeWidth={1.8} aria-hidden />
              </span>
              <span>{copied ? "Đã sao chép!" : "Copy link"}</span>
            </button>

            <a
              href={fbHref}
              target="_blank"
              rel="noopener noreferrer"
              className="post-rail-share-item"
              role="menuitem"
              onClick={() => setShareOpen(false)}
            >
              <span className="post-rail-share-ic post-rail-share-ic--fb">
                f
              </span>
              <span>Facebook</span>
            </a>

            <a
              href={xHref}
              target="_blank"
              rel="noopener noreferrer"
              className="post-rail-share-item"
              role="menuitem"
              onClick={() => setShareOpen(false)}
            >
              <span className="post-rail-share-ic post-rail-share-ic--x">
                𝕏
              </span>
              <span>X (Twitter)</span>
            </a>

            <a
              href={pinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="post-rail-share-item"
              role="menuitem"
              onClick={() => setShareOpen(false)}
            >
              <span className="post-rail-share-ic post-rail-share-ic--pin">
                P
              </span>
              <span>Pinterest</span>
            </a>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
