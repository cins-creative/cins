"use client";

import {
  Bookmark,
  BookmarkCheck,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

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
  milestoneId: string;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  likeCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  showCounts?: boolean;
};

export function PostActionsRail({
  milestoneId,
  initialLiked = false,
  initialBookmarked = false,
  likeCount = 0,
  bookmarkCount = 0,
  commentCount = 0,
  showCounts = false,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likes, setLikes] = useState(likeCount);
  const [bookmarks, setBookmarks] = useState(bookmarkCount);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(() => {
      setLiked(initialLiked);
      setBookmarked(initialBookmarked);
      setLikes(likeCount);
      setBookmarks(bookmarkCount);
    });
  }, [initialLiked, initialBookmarked, likeCount, bookmarkCount]);

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

  function toggleLike() {
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
  }

  function saveBookmark() {
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
  }

  return (
    <aside className="post-rail" aria-label="Hành động bài viết">
      <button
        type="button"
        className={`post-rail-btn ${liked ? "is-active is-like" : ""}`}
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label={liked ? "Bỏ thích" : "Thích"}
        disabled={pending}
      >
        <Heart
          size={20}
          strokeWidth={1.7}
          fill={liked ? "currentColor" : "none"}
          aria-hidden
        />
        {showCounts ? <span className="post-rail-count">{likes}</span> : null}
      </button>

      <button
        type="button"
        className={`post-rail-btn ${bookmarked ? "is-active is-bookmark" : ""}`}
        onClick={saveBookmark}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Bỏ lưu" : "Lưu"}
        disabled={pending}
      >
        {bookmarked ? (
          <BookmarkCheck size={20} strokeWidth={1.7} aria-hidden />
        ) : (
          <Bookmark size={20} strokeWidth={1.7} aria-hidden />
        )}
        <span className="post-rail-lbl">Lưu</span>
        {showCounts ? <span className="post-rail-count">{bookmarks}</span> : null}
      </button>

      <div className="post-rail-btn is-comment-count" aria-label={`${commentCount} bình luận`}>
        <MessageCircle size={20} strokeWidth={1.7} aria-hidden />
        <span className="post-rail-count">{commentCount}</span>
      </div>
    </aside>
  );
}
