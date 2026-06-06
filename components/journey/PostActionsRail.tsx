"use client";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import {
  Bookmark,
  BookmarkCheck,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ PostActionsRail — hành động gọn trong `.post-byline`.            ║
   ║ Thích · Lưu · Bình luận · Chia sẻ (copy, FB, X, LinkedIn, …)   ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  likeCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  showCounts?: boolean;
  /** Ẩn nút Lưu — bài viết của chính viewer (owner cột mốc). */
  canBookmark?: boolean;
  /** Path permalink — VD `/slug/p/post-slug`. */
  sharePath?: string | null;
  shareTitle?: string;
};

type ShareItem = {
  id: string;
  label: string;
  iconClass: string;
  iconLabel: string;
  href?: string;
  onClick?: () => void;
};

function scrollToComments() {
  document
    .getElementById("post-comments")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PostActionsRail({
  milestoneId,
  initialLiked = false,
  initialBookmarked = false,
  likeCount = 0,
  bookmarkCount = 0,
  commentCount = 0,
  showCounts = false,
  canBookmark = true,
  sharePath = null,
  shareTitle = "",
}: Props) {
  const { requireAuth } = useAuthGate();
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likes, setLikes] = useState(likeCount);
  const [bookmarks, setBookmarks] = useState(bookmarkCount);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const shareWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setLiked(initialLiked);
      setBookmarked(initialBookmarked);
      setLikes(likeCount);
      setBookmarks(bookmarkCount);
    });
  }, [initialLiked, initialBookmarked, likeCount, bookmarkCount]);

  useEffect(() => {
    const path = sharePath?.trim();
    if (path) {
      setShareUrl(`${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`);
      return;
    }
    setShareUrl(window.location.href);
  }, [sharePath]);

  useEffect(() => {
    const onSocial = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          milestoneId: string;
          liked?: boolean;
          likeCount?: number;
          bookmarked?: boolean;
          bookmarkCount?: number;
        }>
      ).detail;
      if (detail.milestoneId !== milestoneId) return;
      if (typeof detail.liked === "boolean") setLiked(detail.liked);
      if (typeof detail.likeCount === "number") setLikes(detail.likeCount);
      if (typeof detail.bookmarked === "boolean") setBookmarked(detail.bookmarked);
      if (typeof detail.bookmarkCount === "number") setBookmarks(detail.bookmarkCount);
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [milestoneId]);

  useEffect(() => {
    if (!shareOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!shareWrapRef.current?.contains(e.target as Node)) setShareOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setShareOpen(false);
    }
    const timerId = window.setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 0);
    document.addEventListener("keydown", onEsc);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [shareOpen]);

  function toggleLike() {
    requireAuth(() => {
      const nextLiked = !liked;
      const nextCount = Math.max(0, likes + (nextLiked ? 1 : -1));
      setLiked(nextLiked);
      setLikes(nextCount);
      window.dispatchEvent(
        new CustomEvent("cins:social-action", {
          detail: { milestoneId, liked: nextLiked, likeCount: nextCount },
        }),
      );
      startTransition(async () => {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: "cot_moc",
            id_doi_tuong: milestoneId,
            emoji: "heart",
            active: nextLiked,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) return;
          setLiked(liked);
          setLikes(likes);
          return;
        }
        const syncedLiked = Boolean(json.liked);
        const syncedCount = Number(json.count ?? nextCount);
        setLiked(syncedLiked);
        setLikes(syncedCount);
        window.dispatchEvent(
          new CustomEvent("cins:social-action", {
            detail: { milestoneId, liked: syncedLiked, likeCount: syncedCount },
          }),
        );
      });
    });
  }

  function saveBookmark() {
    requireAuth(() => {
      const nextCount = bookmarked ? bookmarks : bookmarks + 1;
      setBookmarked(true);
      setBookmarks(nextCount);
      window.dispatchEvent(
        new CustomEvent("cins:social-action", {
          detail: { milestoneId, bookmarked: true, bookmarkCount: nextCount },
        }),
      );
      startTransition(async () => {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: "cot_moc",
            id_doi_tuong: milestoneId,
            visibility: "public",
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) return;
          setBookmarked(bookmarked);
          setBookmarks(bookmarks);
          return;
        }
        const syncedCount = Number(json.count ?? nextCount);
        setBookmarked(true);
        setBookmarks(syncedCount);
        window.dispatchEvent(
          new CustomEvent("cins:social-action", {
            detail: { milestoneId, bookmarked: true, bookmarkCount: syncedCount },
          }),
        );
      });
    });
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Fallback cho trình duyệt cũ. */
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
    setShareOpen(false);
  }

  async function nativeShare() {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: shareTitle || "CINs",
        url: shareUrl,
      });
      setShareOpen(false);
    } catch {
      /* User huỷ hoặc trình duyệt từ chối — giữ menu mở. */
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(shareTitle || "CINs");

  const shareItems: ShareItem[] = [
    ...(typeof navigator !== "undefined" && "share" in navigator
      ? [
          {
            id: "native",
            label: "Chia sẻ…",
            iconClass: "post-byline-share-ic--native",
            iconLabel: "↗",
            onClick: () => void nativeShare(),
          },
        ]
      : []),
    {
      id: "copy",
      label: copied ? "Đã sao chép!" : "Sao chép liên kết",
      iconClass: "post-byline-share-ic--copy",
      iconLabel: "⎘",
      onClick: () => void copyLink(),
    },
    {
      id: "facebook",
      label: "Facebook",
      iconClass: "post-byline-share-ic--fb",
      iconLabel: "f",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: "x",
      label: "X (Twitter)",
      iconClass: "post-byline-share-ic--x",
      iconLabel: "𝕏",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      iconClass: "post-byline-share-ic--in",
      iconLabel: "in",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: "zalo",
      label: "Zalo",
      iconClass: "post-byline-share-ic--zalo",
      iconLabel: "Z",
      href: `https://button-share.zalo.me/share_external?layout=1&color=blue&customize=false&width=24&height=24&isDesktop=true&href=${encodedUrl}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      iconClass: "post-byline-share-ic--wa",
      iconLabel: "W",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareTitle ? `${shareTitle} — ` : ""}${shareUrl}`)}`,
    },
    {
      id: "pinterest",
      label: "Pinterest",
      iconClass: "post-byline-share-ic--pin",
      iconLabel: "P",
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
    },
  ];

  return (
    <div className="post-byline-actions" aria-label="Hành động bài viết">
      <button
        type="button"
        className={`post-byline-act ${liked ? "is-active is-like" : ""}`}
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label={liked ? "Bỏ thích" : "Thích"}
        disabled={pending}
      >
        <Heart
          size={16}
          strokeWidth={1.8}
          fill={liked ? "currentColor" : "none"}
          aria-hidden
        />
        {showCounts ? <span className="post-byline-act-count">{likes}</span> : null}
      </button>

      {canBookmark ? (
        <button
          type="button"
          className={`post-byline-act ${bookmarked ? "is-active is-bookmark" : ""}`}
          onClick={saveBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Bỏ lưu" : "Lưu"}
          disabled={pending}
        >
          {bookmarked ? (
            <BookmarkCheck size={16} strokeWidth={1.8} aria-hidden />
          ) : (
            <Bookmark size={16} strokeWidth={1.8} aria-hidden />
          )}
          {showCounts ? (
            <span className="post-byline-act-count">{bookmarks}</span>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        className="post-byline-act is-comment"
        onClick={() =>
          requireAuth(scrollToComments)
        }
        aria-label={`${commentCount} bình luận — cuộn tới phần bình luận`}
      >
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
        <span className="post-byline-act-count">{commentCount}</span>
      </button>

      <div
        ref={shareWrapRef}
        className={"post-byline-share-wrap" + (shareOpen ? " is-open" : "")}
      >
        <button
          type="button"
          className="post-byline-act is-share"
          onClick={(e) => {
            e.stopPropagation();
            setShareOpen((v) => !v);
          }}
          aria-haspopup="menu"
          aria-expanded={shareOpen}
          aria-label="Chia sẻ bài viết"
        >
          <Share2 size={16} strokeWidth={1.8} aria-hidden />
        </button>

        {shareOpen ? (
          <div className="post-byline-share" role="menu">
            {shareItems.map((item) =>
              item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  className="post-byline-share-item"
                  role="menuitem"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShareOpen(false)}
                >
                  <span
                    className={`post-byline-share-ic ${item.iconClass}`}
                    aria-hidden
                  >
                    {item.iconLabel}
                  </span>
                  <span>{item.label}</span>
                </a>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className="post-byline-share-item"
                  role="menuitem"
                  onClick={item.onClick}
                >
                  <span
                    className={`post-byline-share-ic ${item.iconClass}`}
                    aria-hidden
                  >
                    {item.iconLabel}
                  </span>
                  <span>{item.label}</span>
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
