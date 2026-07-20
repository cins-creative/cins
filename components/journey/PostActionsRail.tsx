"use client";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import { SharePostToFriendsPanel } from "@/components/social/SharePostToFriendsPanel";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { POST_COMMENTS_SYNC_EVENT } from "@/lib/journey/comments-sync-client";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  useCallback,
} from "react";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ PostActionsRail — hành động gọn trong `.post-byline`.            ║
   ║ Thích · Lưu · Bình luận · Chia sẻ (copy, FB, X, LinkedIn, …)   ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  /** True khi viewer đã bình luận (chưa xóa) — tô màu nút. */
  initialCommented?: boolean;
  likeCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  showCounts?: boolean;
  /** Ẩn nút Lưu — bài viết của chính viewer (owner cột mốc). */
  canBookmark?: boolean;
  /** Path permalink — VD `/slug/p/post-slug`. */
  sharePath?: string | null;
  shareTitle?: string;
  /** Ẩn chia sẻ trong rail — render `PostShareMenu` riêng (sidebar). */
  hideShare?: boolean;
  /** Permalink sidebar — danh sách dọc có nhãn. */
  orientation?: "horizontal" | "vertical";
  showLabels?: boolean;
};

type ShareMenuProps = {
  sharePath?: string | null;
  shareTitle?: string;
  className?: string;
  /** Class nút trigger — mặc định byline; jcard dùng `share-btn`. */
  buttonClassName?: string;
  showLabel?: boolean;
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

export function PostShareMenu({
  sharePath = null,
  shareTitle = "",
  className = "",
  buttonClassName = "post-byline-act is-share",
  showLabel = false,
}: ShareMenuProps) {
  const authGate = useOptionalAuthGate();
  const [shareOpen, setShareOpen] = useState(false);
  const [panel, setPanel] = useState<"main" | "friends">("main");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const shareWrapRef = useRef<HTMLDivElement>(null);

  function closeShare() {
    setShareOpen(false);
    setPanel("main");
    setFlash(null);
  }

  useEffect(() => {
    const path = sharePath?.trim();
    if (path) {
      setShareUrl(`${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`);
      return;
    }
    setShareUrl(window.location.href);
  }, [sharePath]);

  useEffect(() => {
    if (!shareOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!shareWrapRef.current?.contains(e.target as Node)) closeShare();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (panel === "friends") {
        setPanel("main");
        setFlash(null);
      } else {
        closeShare();
      }
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
  }, [shareOpen, panel]);

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
    closeShare();
  }

  async function nativeShare() {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: shareTitle || "CINs",
        url: shareUrl,
      });
      closeShare();
    } catch {
      /* User huỷ — giữ menu mở. */
    }
  }

  function openFriendsPanel() {
    const go = () => {
      setFlash(null);
      setPanel("friends");
    };
    if (authGate && !authGate.isAuthenticated) {
      authGate.requireAuth(go);
      return;
    }
    go();
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
      iconLabel: "",
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
      id: "pinterest",
      label: "Pinterest",
      iconClass: "post-byline-share-ic--pin",
      iconLabel: "P",
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
    },
  ];

  return (
    <div
      ref={shareWrapRef}
      className={
        "post-byline-share-wrap" +
        (shareOpen ? " is-open" : "") +
        (panel === "friends" ? " is-friends" : "") +
        (className ? ` ${className}` : "")
      }
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={buttonClassName}
        onClick={(e) => {
          e.stopPropagation();
          if (shareOpen) closeShare();
          else {
            setPanel("main");
            setFlash(null);
            setShareOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={shareOpen}
        aria-label="Chia sẻ bài viết"
      >
        <Share2 size={16} strokeWidth={1.8} aria-hidden />
        {showLabel ? (
          <span className="post-byline-share-label">Chia sẻ</span>
        ) : null}
      </button>

      {shareOpen ? (
        <div
          className={
            "post-byline-share" +
            (panel === "friends" ? " post-byline-share--friends" : "")
          }
          role="menu"
        >
          {panel === "friends" ? (
            <>
              <button
                type="button"
                className="post-byline-share-item"
                role="menuitem"
                onClick={() => {
                  setFlash(null);
                  setPanel("main");
                }}
              >
                <span
                  className="post-byline-share-ic post-byline-share-ic--back"
                  aria-hidden
                >
                  ←
                </span>
                <span>Quay lại</span>
              </button>
              {flash ? (
                <p className="j-m-share-friends-flash" role="status">
                  {flash}
                </p>
              ) : null}
              {shareUrl ? (
                <SharePostToFriendsPanel
                  shareUrl={shareUrl}
                  shareTitle={shareTitle || null}
                  onDone={(message) => {
                    setFlash(message);
                    window.setTimeout(() => closeShare(), 900);
                  }}
                />
              ) : null}
            </>
          ) : (
            <>
              <button
                type="button"
                className="post-byline-share-item"
                role="menuitem"
                onClick={openFriendsPanel}
              >
                <span
                  className="post-byline-share-ic post-byline-share-ic--friends"
                  aria-hidden
                >
                  <MessageCircle size={14} strokeWidth={2} />
                </span>
                <span>Gửi bạn bè, nhóm, tổ chức</span>
              </button>
              {shareItems.map((item) =>
                item.href ? (
                  <a
                    key={item.id}
                    href={item.href}
                    className="post-byline-share-item"
                    role="menuitem"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => closeShare()}
                  >
                    <span
                      className={`post-byline-share-ic ${item.iconClass}`}
                      aria-hidden
                    >
                      {item.id === "copy" ? (
                        <Copy size={14} strokeWidth={2} />
                      ) : (
                        item.iconLabel
                      )}
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
                      {item.id === "copy" ? (
                        <Copy size={14} strokeWidth={2} />
                      ) : (
                        item.iconLabel
                      )}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ),
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function PostActionsRail({
  milestoneId,
  initialLiked = false,
  initialBookmarked = false,
  initialCommented = false,
  likeCount = 0,
  bookmarkCount = 0,
  commentCount = 0,
  showCounts = false,
  canBookmark = true,
  sharePath = null,
  shareTitle = "",
  hideShare = false,
  orientation = "horizontal",
  showLabels = false,
}: Props) {
  const isVertical = orientation === "vertical";
  const authGate = useOptionalAuthGate();
  const requireAuth = useCallback(
    (action: () => void) => {
      if (authGate) {
        authGate.requireAuth(action);
        return;
      }
      action();
    },
    [authGate],
  );
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [commented, setCommented] = useState(initialCommented);
  const [likes, setLikes] = useState(likeCount);
  const [bookmarks, setBookmarks] = useState(bookmarkCount);
  const [likeActorsOpen, setLikeActorsOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(() => {
      setLiked(initialLiked);
      setBookmarked(initialBookmarked);
      setCommented(initialCommented);
      setLikes(likeCount);
      setBookmarks(bookmarkCount);
    });
  }, [
    initialLiked,
    initialBookmarked,
    initialCommented,
    likeCount,
    bookmarkCount,
  ]);

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
    function onCommentsSync(event: Event) {
      const detail = (
        event as CustomEvent<{
          milestoneId?: string;
          viewerCommented?: boolean;
        }>
      ).detail;
      if (detail?.milestoneId !== milestoneId) return;
      if (typeof detail.viewerCommented === "boolean") {
        setCommented(detail.viewerCommented);
      }
    }
    window.addEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
    return () =>
      window.removeEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
  }, [milestoneId]);

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
        const res = await fetch("/api/luu-bai", {
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

  return (
    <div
      className={
        "post-byline-actions" +
        (isVertical ? " post-byline-actions--vertical" : "")
      }
      aria-label="Hành động bài viết"
    >
      <button
        type="button"
        className={`post-byline-act ${liked ? "is-active is-like" : ""}`}
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label={liked ? "Bỏ thích" : "Thích"}
        disabled={pending}
      >
        <Heart
          size={isVertical ? 18 : 16}
          strokeWidth={1.8}
          fill={liked ? "currentColor" : "none"}
          aria-hidden
        />
        {showLabels ? <span className="post-byline-act-label">Thích</span> : null}
        {showCounts ? (
          likes > 0 ? (
            <span
              className={
                "post-byline-act-count post-byline-act-count--actors" +
                (isVertical ? " post-byline-act-n" : "")
              }
              role="button"
              tabIndex={0}
              aria-label="Xem người thích"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLikeActorsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setLikeActorsOpen(true);
                }
              }}
            >
              {likes}
            </span>
          ) : (
            <span
              className={
                "post-byline-act-count" + (isVertical ? " post-byline-act-n" : "")
              }
            >
              {likes}
            </span>
          )
        ) : null}
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
            <BookmarkCheck
              size={isVertical ? 18 : 16}
              strokeWidth={1.8}
              aria-hidden
            />
          ) : (
            <Bookmark size={isVertical ? 18 : 16} strokeWidth={1.8} aria-hidden />
          )}
          {showLabels ? <span className="post-byline-act-label">Lưu</span> : null}
          {showCounts ? (
            <span
              className={
                "post-byline-act-count" + (isVertical ? " post-byline-act-n" : "")
              }
            >
              {bookmarks}
            </span>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        className={
          "post-byline-act is-comment" + (commented ? " is-active is-commented" : "")
        }
        onClick={() => requireAuth(scrollToComments)}
        aria-label={
          commented
            ? `${commentCount} bình luận — bạn đã bình luận`
            : `${commentCount} bình luận — cuộn tới phần bình luận`
        }
        aria-pressed={commented || undefined}
      >
        <MessageCircle
          size={isVertical ? 18 : 16}
          strokeWidth={1.8}
          fill={commented ? "currentColor" : "none"}
          aria-hidden
        />
        {showLabels ? (
          <span className="post-byline-act-label">Bình luận</span>
        ) : null}
        <span
          className={
            "post-byline-act-count" + (isVertical ? " post-byline-act-n" : "")
          }
        >
          {commentCount}
        </span>
      </button>

      {hideShare ? null : (
        <PostShareMenu
          sharePath={sharePath}
          shareTitle={shareTitle}
          showLabel={showLabels}
          className={isVertical ? "post-byline-share-vertical" : ""}
        />
      )}

      <JourneySocialActorsModal
        open={likeActorsOpen}
        onClose={() => setLikeActorsOpen(false)}
        kind="like"
        loaiDoiTuong={SOCIAL_LOAI_DOI_TUONG.COT_MOC}
        idDoiTuong={milestoneId}
      />
    </div>
  );
}
