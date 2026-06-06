"use client";

import Link from "next/link";
import { ArrowRight, Bell, Check, Video, X } from "lucide-react";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { CoAuthorInviteMessage } from "@/components/journey/CoAuthorInviteMessage";
import type {
  CommentNotification,
  CoAuthorReviewProfile,
  FollowAcceptedNotification,
  NotificationFeed,
  NotificationFilter,
  PendingCoAuthorInviteNotification,
  PendingCoAuthorReview,
  PendingFollowRequest,
  ProcessedCoAuthorReview,
  VideoReadyNotification,
} from "@/lib/social/types";

type Props = {
  /** Badge từ server — feed chi tiết lazy-load khi mở menu. */
  initialUnreadCount: number;
  viewerProfileId: string;
};

function coAuthorPostHref(inv: PendingCoAuthorInviteNotification): string | null {
  if (!inv.ownerSlug || !inv.postSlug) return null;
  return `/${encodeURIComponent(inv.ownerSlug)}/p/${encodeURIComponent(inv.postSlug)}`;
}

const EMPTY_HISTORY_FEED: NotificationFeed = {
  unreadCount: 0,
  followRequests: [],
  accepted: [],
  comments: [],
  coAuthorInvites: [],
  coAuthorReviews: [],
  videoReady: [],
  handledFollows: [],
  processedCoAuthorReviews: [],
};

function formatNotifyTime(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function commentNotifyLabel(notice: CommentNotification): ReactNode {
  const count = notice.commentCount ?? 1;
  if (count > 1) {
    return (
      <>
        <strong>{notice.tenHienThi}</strong> đã bình luận {count} lần trên bài viết.
        <small>{notice.postTitle}</small>
      </>
    );
  }
  return (
    <>
      <strong>{notice.tenHienThi}</strong> đã bình luận bài viết.
      <small>{notice.postTitle}</small>
    </>
  );
}

function parseFeedPayload(json: unknown): NotificationFeed | null {
  if (!json || typeof json !== "object") return null;
  const data = json as NotificationFeed;
  if (!Array.isArray(data.followRequests)) return null;
  return {
    ...EMPTY_HISTORY_FEED,
    ...data,
    coAuthorInvites: Array.isArray(data.coAuthorInvites) ? data.coAuthorInvites : [],
    coAuthorReviews: Array.isArray(data.coAuthorReviews) ? data.coAuthorReviews : [],
  };
}

function countDisplayedItems(feed: NotificationFeed): number {
  return (
    feed.followRequests.length +
    feed.accepted.length +
    feed.comments.length +
    feed.coAuthorInvites.length +
    feed.coAuthorReviews.length +
    feed.videoReady.length +
    feed.handledFollows.length +
    feed.processedCoAuthorReviews.length
  );
}

export function JourneyNotifications({
  initialUnreadCount,
  viewerProfileId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationFilter>("unread");
  const [selected, setSelected] = useState<PendingFollowRequest | null>(null);
  const [feed, setFeed] = useState<NotificationFeed>({
    ...EMPTY_HISTORY_FEED,
    unreadCount: initialUnreadCount,
  });
  const [historyFeed, setHistoryFeed] = useState<NotificationFeed | null>(null);
  const [loadingUnread, setLoadingUnread] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unreadLoaded, setUnreadLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; right: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideClickRef = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const updatePosition = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 10,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let removeListener: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      function onDocClick(event: MouseEvent) {
        if (ignoreOutsideClickRef.current) {
          ignoreOutsideClickRef.current = false;
          return;
        }
        const target = event.target as Node;
        if (triggerRef.current?.contains(target)) return;
        if (menuRef.current?.contains(target)) return;
        setOpen(false);
      }
      document.addEventListener("click", onDocClick, true);
      removeListener = () =>
        document.removeEventListener("click", onDocClick, true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      removeListener?.();
    };
  }, [open]);

  const applyFeed = useCallback((next: NotificationFeed) => {
    setFeed(next);
    setUnreadLoaded(true);
  }, []);

  const unreadCount = feed.unreadCount;
  const activeFeed = tab === "history" && historyFeed ? historyFeed : feed;

  const displayedCount = useMemo(
    () => countDisplayedItems(activeFeed),
    [activeFeed],
  );

  const historyCount = useMemo(() => {
    if (!historyFeed) return null;
    return countDisplayedItems(historyFeed);
  }, [historyFeed]);

  const loadUnread = useCallback(async () => {
    setLoadingUnread(true);
    try {
      const res = await fetch("/api/notifications?filter=unread", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          json && typeof json.error === "string"
            ? json.error
            : "Không tải được thông báo.",
        );
        return;
      }
      const next = parseFeedPayload(json);
      if (next) applyFeed(next);
    } finally {
      setLoadingUnread(false);
    }
  }, [applyFeed]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/notifications?filter=history", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setHistoryFeed(EMPTY_HISTORY_FEED);
        setError(
          json && typeof json.error === "string"
            ? json.error
            : "Không tải được lịch sử thông báo.",
        );
        return;
      }
      setHistoryFeed(parseFeedPayload(json) ?? EMPTY_HISTORY_FEED);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (tab === "unread" && !unreadLoaded && !loadingUnread) {
      void loadUnread();
    }
    if (tab === "history" && !historyFeed && !loadingHistory) {
      void loadHistory();
    }
  }, [
    open,
    tab,
    unreadLoaded,
    loadingUnread,
    historyFeed,
    loadingHistory,
    loadUnread,
    loadHistory,
  ]);

  const refreshUnread = useCallback(() => {
    void fetch("/api/notifications?filter=unread", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: NotificationFeed | null) => {
        if (json) applyFeed(json);
      })
      .catch(() => {
        /* giữ state hiện tại */
      });
  }, [applyFeed]);

  useEffect(() => {
    window.addEventListener("cins:video-ready", refreshUnread);
    window.addEventListener("cins:notifications-changed", refreshUnread);
    return () => {
      window.removeEventListener("cins:video-ready", refreshUnread);
      window.removeEventListener("cins:notifications-changed", refreshUnread);
    };
  }, [refreshUnread]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshUnread]);

  const markRead = (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;
    startTransition(async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_ids: notificationIds }),
      });
      const json = await res.json().catch(() => null);
      const next = parseFeedPayload(json);
      if (res.ok && next) applyFeed(next);
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      const json = await res.json().catch(() => null);
      const next = parseFeedPayload(json);
      if (res.ok && next) applyFeed(next);
    });
  };

  const respond = (request: PendingFollowRequest, action: "accept" | "decline") => {
    setError(null);
    const recordId = request.ketBanId;
    if (!recordId) {
      setError("Không tìm thấy lời mời.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/ket-ban/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Không xử lý được.");
        return;
      }
      const next = parseFeedPayload(json);
      if (next) applyFeed(next);
      setSelected(null);
      if (tab === "history") void loadHistory();
    });
  };

  const respondCoAuthorInvite = (
    invite: PendingCoAuthorInviteNotification,
    action: "accepted" | "declined",
  ) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/tac-pham/${invite.tacPhamId}/tac-gia/${viewerProfileId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trang_thai: action }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Không xử lý được.");
        return;
      }
      const feedRes = await fetch("/api/notifications?filter=unread");
      const feedJson = await feedRes.json().catch(() => null);
      const next = parseFeedPayload(feedJson);
      if (next) applyFeed(next);
    });
  };

  const respondCoAuthorReview = (
    review: PendingCoAuthorReview,
    action: "accept" | "decline",
  ) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/coauthor/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: review.notificationId,
          action,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Không xử lý được.");
        return;
      }
      const next = parseFeedPayload(json);
      if (next) applyFeed(next);
      if (tab === "history") void loadHistory();
    });
  };

  const selectedStillPending = useMemo(
    () => selected && feed.followRequests.some((r) => r.idNguoiDung === selected.idNguoiDung),
    [feed.followRequests, selected],
  );

  const listCount =
    tab === "unread"
      ? unreadLoaded
        ? displayedCount
        : unreadCount
      : historyCount ?? 0;

  const showMoreHint =
    tab === "unread" && unreadLoaded && unreadCount > displayedCount;

  const title =
    unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo mới";

  const menuPanel = open && menuStyle ? (
        <div
          ref={menuRef}
          className="j-notify-menu is-portal"
          style={{ top: menuStyle.top, right: menuStyle.right, left: "auto" }}
        >
          <div className="j-notify-head">
            <strong>Thông báo</strong>
            <span>{tab === "unread" ? `${unreadCount} chưa xử lý` : `${listCount} đã xử lý`}</span>
          </div>

          <div className="j-notify-tabs" role="tablist" aria-label="Lọc thông báo">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "unread"}
              className={`j-notify-tab${tab === "unread" ? " is-active" : ""}`}
              onClick={() => setTab("unread")}
            >
              Chưa xử lý
              {unreadCount > 0 ? <em>{unreadCount}</em> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "history"}
              className={`j-notify-tab${tab === "history" ? " is-active" : ""}`}
              onClick={() => setTab("history")}
            >
              Lịch sử
            </button>
          </div>

          {tab === "unread" && unreadCount > 0 ? (
            <div className="j-notify-toolbar">
              <button
                type="button"
                className="j-notify-mark-all"
                disabled={pending}
                onClick={markAllRead}
              >
                Đánh dấu đã đọc
              </button>
            </div>
          ) : null}

          {(tab === "unread" && loadingUnread && !unreadLoaded) ||
          (tab === "history" && loadingHistory) ? (
            <p className="j-notify-empty">Đang tải…</p>
          ) : listCount === 0 ? (
            <p className="j-notify-empty">
              {tab === "unread"
                ? "Không có thông báo cần xử lý."
                : "Chưa có lịch sử. Lịch sử gồm: kết nối đã chấp nhận/từ chối, ai đó chấp nhận kết bạn với bạn, bình luận/video đã đọc."}
            </p>
          ) : (
            <ul className="j-notify-list">
              {tab === "unread" ? (
                <>
                  {activeFeed.videoReady.map((notice) => (
                    <UnreadVideoItem
                      key={notice.notificationId}
                      notice={notice}
                      onOpen={() => {
                        markRead([notice.notificationId]);
                        setOpen(false);
                      }}
                    />
                  ))}
                  {activeFeed.comments.map((notice) => (
                    <UnreadCommentItem
                      key={notice.notificationId}
                      notice={notice}
                      onOpen={() => markRead([notice.notificationId])}
                    />
                  ))}
                  {activeFeed.coAuthorInvites.map((invite) => {
                    const postHref = coAuthorPostHref(invite);
                    return (
                      <li key={invite.notificationId}>
                        <div className="j-notify-item is-coauthor-invite">
                          <CoAuthorInviteMessage
                            ownerName={invite.ownerName}
                            postTitle={invite.postTitle}
                            vaiTro={invite.vaiTro}
                            className="j-coauthor-invite-message j-notify-coauthor-invite-text"
                          />
                          <div className="j-notify-inline-actions">
                            {postHref ? (
                              <a
                                href={postHref}
                                className="j-notify-mini-action is-link"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Xem nội dung
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="j-notify-mini-action is-accept"
                              disabled={pending}
                              onClick={() => respondCoAuthorInvite(invite, "accepted")}
                            >
                              Chấp nhận
                            </button>
                            <button
                              type="button"
                              className="j-notify-mini-action"
                              disabled={pending}
                              onClick={() => respondCoAuthorInvite(invite, "declined")}
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {activeFeed.coAuthorReviews.map((review) => (
                    <li key={review.notificationId}>
                      <div className="j-notify-item is-coauthor-review">
                        <Avatar request={review.proposer} />
                        <span>
                          <strong>{review.proposer.tenHienThi}</strong> đề xuất thêm{" "}
                          <b>{review.target.tenHienThi}</b> vào bài viết.
                          <small>
                            {review.postTitle}
                            {review.vaiTro ? ` · ${review.vaiTro}` : ""}
                          </small>
                        </span>
                        <div className="j-notify-inline-actions">
                          <button
                            type="button"
                            className="j-notify-mini-action is-accept"
                            disabled={pending}
                            onClick={() => respondCoAuthorReview(review, "accept")}
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="j-notify-mini-action"
                            disabled={pending}
                            onClick={() => respondCoAuthorReview(review, "decline")}
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {activeFeed.accepted.map((notice) => (
                    <UnreadAcceptedItem
                      key={notice.notificationId}
                      notice={notice}
                      onOpen={() => markRead([notice.notificationId])}
                    />
                  ))}
                  {activeFeed.followRequests.map((request) => (
                    <li key={request.idNguoiDung}>
                      <button
                        type="button"
                        className="j-notify-item is-pending"
                        onClick={() => setSelected(request)}
                      >
                        <Avatar request={request} />
                        <span>
                          <strong>{request.tenHienThi}</strong> muốn kết nối với bạn.
                          <small>@{request.slug}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </>
              ) : (
                <>
                  {activeFeed.handledFollows.map((item) => (
                    <li key={item.notificationId}>
                      <Link href={`/${item.slug}`} className="j-notify-item is-history">
                        <Avatar request={item} />
                        <span>
                          <strong>{item.tenHienThi}</strong>{" "}
                          {item.action === "accept" ? "— bạn đã chấp nhận kết nối" : "— bạn đã từ chối"}
                          <small>{formatNotifyTime(item.xuLyLuc)}</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {activeFeed.processedCoAuthorReviews.map((review) => (
                    <HistoryCoAuthorItem key={review.notificationId} review={review} />
                  ))}
                  {activeFeed.accepted.map((notice) => (
                    <HistoryInfoItem
                      key={notice.notificationId}
                      href={`/${notice.slug}`}
                      label={
                        <>
                          <strong>{notice.tenHienThi}</strong> đã chấp nhận kết bạn.
                        </>
                      }
                      time={formatNotifyTime(notice.taoLuc)}
                      avatar={<Avatar request={notice} />}
                    />
                  ))}
                  {activeFeed.comments.map((notice) => (
                    <HistoryInfoItem
                      key={notice.notificationId}
                      href={
                        notice.ownerSlug && notice.postSlug
                          ? `/${notice.ownerSlug}/p/${notice.postSlug}`
                          : `/${notice.slug}`
                      }
                      label={commentNotifyLabel(notice)}
                      time={formatNotifyTime(notice.taoLuc)}
                      avatar={<Avatar request={notice} />}
                    />
                  ))}
                  {activeFeed.videoReady.map((notice) => (
                    <HistoryInfoItem
                      key={notice.notificationId}
                      href={
                        notice.ownerSlug && notice.postSlug
                          ? `/${notice.ownerSlug}/p/${notice.postSlug}`
                          : "#"
                      }
                      label={
                        <>
                          <strong>Video đã sẵn sàng</strong>
                          <small>{notice.postTitle}</small>
                        </>
                      }
                      time={formatNotifyTime(notice.taoLuc)}
                      avatar={
                        <span className="j-notify-avatar is-video" aria-hidden>
                          <Video size={16} strokeWidth={1.8} />
                        </span>
                      }
                    />
                  ))}
                </>
              )}
            </ul>
          )}
          {showMoreHint ? (
            <p className="j-notify-more-hint">
              Hiển thị {displayedCount} / {unreadCount} thông báo chưa xử lý.
            </p>
          ) : null}
          {error ? (
            <p className="j-notify-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
  ) : null;

  return (
    <div className="j-notify">
      <button
        ref={triggerRef}
        type="button"
        className={`j-notify-trigger${unreadCount > 0 ? " has-unread" : ""}`}
        aria-expanded={open}
        aria-label={title}
        onClick={() => {
          ignoreOutsideClickRef.current = true;
          setOpen((v) => !v);
        }}
      >
        <Bell size={16} strokeWidth={1.9} aria-hidden />
        {unreadCount > 0 ? <span className="j-notify-count">{unreadCount}</span> : null}
      </button>

      {portalReady && menuPanel
        ? createPortal(menuPanel, document.body)
        : null}

      {selected ? (
        <FollowRequestModal
          selected={selected}
          pending={pending}
          showActions={Boolean(selectedStillPending)}
          onClose={() => setSelected(null)}
          onRespond={respond}
        />
      ) : null}
    </div>
  );
}

function UnreadVideoItem({
  notice,
  onOpen,
}: {
  notice: VideoReadyNotification;
  onOpen: () => void;
}) {
  return (
    <li>
      <Link
        href={
          notice.ownerSlug && notice.postSlug
            ? `/${notice.ownerSlug}/p/${notice.postSlug}`
            : "#"
        }
        className="j-notify-item is-video-ready"
        onClick={onOpen}
      >
        <span className="j-notify-avatar is-video" aria-hidden>
          <Video size={16} strokeWidth={1.8} />
        </span>
        <span>
          <strong>Video đã sẵn sàng</strong>
          <small>{notice.postTitle}</small>
        </span>
      </Link>
    </li>
  );
}

function UnreadCommentItem({
  notice,
  onOpen,
}: {
  notice: CommentNotification;
  onOpen: () => void;
}) {
  return (
    <li>
      <Link
        href={
          notice.ownerSlug && notice.postSlug
            ? `/${notice.ownerSlug}/p/${notice.postSlug}`
            : `/${notice.slug}`
        }
        className="j-notify-item is-comment"
        onClick={onOpen}
      >
        <Avatar request={notice} />
        <span>{commentNotifyLabel(notice)}</span>
      </Link>
    </li>
  );
}

function UnreadAcceptedItem({
  notice,
  onOpen,
}: {
  notice: FollowAcceptedNotification;
  onOpen: () => void;
}) {
  return (
    <li>
      <Link
        href={`/${notice.slug}`}
        className="j-notify-item is-accepted"
        onClick={onOpen}
      >
        <Avatar request={notice} />
        <span>
          <strong>{notice.tenHienThi}</strong> đã chấp nhận kết bạn.
          <small>@{notice.slug}</small>
        </span>
      </Link>
    </li>
  );
}

function HistoryCoAuthorItem({ review }: { review: ProcessedCoAuthorReview }) {
  const label =
    review.action === "accept"
      ? "Bạn đã duyệt đề xuất cộng sự"
      : "Bạn đã từ chối đề xuất cộng sự";
  return (
    <li>
      <Link
        href={
          review.ownerSlug && review.postSlug
            ? `/${review.ownerSlug}/p/${review.postSlug}`
            : "#"
        }
        className="j-notify-item is-history"
      >
        <Avatar request={review.proposer} />
        <span>
          {label}: <strong>{review.target.tenHienThi}</strong>
          <small>
            {review.postTitle}
            {review.vaiTro ? ` · ${review.vaiTro}` : ""} · {formatNotifyTime(review.xuLyLuc)}
          </small>
        </span>
      </Link>
    </li>
  );
}

function HistoryInfoItem({
  href,
  label,
  time,
  avatar,
}: {
  href: string;
  label: ReactNode;
  time: string;
  avatar: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="j-notify-item is-history">
        {avatar}
        <span>
          {label}
          {time ? <small>{time}</small> : null}
        </span>
      </Link>
    </li>
  );
}

function FollowRequestModal({
  selected,
  pending,
  showActions,
  onClose,
  onRespond,
}: {
  selected: PendingFollowRequest;
  pending: boolean;
  showActions: boolean;
  onClose: () => void;
  onRespond: (request: PendingFollowRequest, action: "accept" | "decline") => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [preview, setPreview] = useState<{
    coverUrl: string | null;
    aiSummaryJourney: string | null;
    stats: { cotMoc: number; tacPham: number; banBe: number };
  } | null>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    void fetch(`/api/users/preview?slug=${encodeURIComponent(selected.slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.profile) return;
        setPreview({
          coverUrl: json.profile.coverUrl ?? null,
          aiSummaryJourney: json.profile.aiSummaryJourney ?? null,
          stats: json.profile.stats ?? {
            cotMoc: selected.stats.cotMoc,
            tacPham: selected.stats.tacPham,
            banBe: selected.stats.banBe,
          },
        });
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.slug, selected.stats.banBe, selected.stats.cotMoc, selected.stats.tacPham]);

  const coverUrl = preview?.coverUrl ?? selected.coverUrl;
  const stats = preview?.stats ?? {
    cotMoc: selected.stats.cotMoc,
    tacPham: selected.stats.tacPham,
    banBe: selected.stats.banBe,
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="j-user-popover-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="j-user-popover j-notify-request-popover"
        role="dialog"
        aria-modal="true"
        aria-label={`Thông tin ${selected.tenHienThi}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="j-user-pop-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={16} aria-hidden />
        </button>
        <article className="j-friend-card j-user-pop-card j-frq-card">
          <div
            className={`j-friend-cover${coverUrl ? " has-img" : ""}`}
            aria-hidden
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" />
            ) : null}
          </div>
          <div className="j-friend-avatar">
            {selected.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.avatarUrl} alt="" />
            ) : (
              <span>{(selected.tenHienThi || selected.slug).slice(0, 1)}</span>
            )}
          </div>
          <div className="j-friend-body">
            <h3>{selected.tenHienThi}</h3>
            <p className="j-friend-slug">@{selected.slug}</p>
            {selected.bio ? <p className="j-friend-bio">{selected.bio}</p> : null}
            {preview?.aiSummaryJourney ? (
              <p className="j-user-pop-ai">
                <strong>AI tóm tắt</strong>
                {preview.aiSummaryJourney}
              </p>
            ) : previewLoading ? (
              <p className="j-user-pop-ai is-loading">Đang tải AI tóm tắt...</p>
            ) : null}
            <div className="j-friend-stats" aria-label="Thống kê hồ sơ">
              <span>
                <strong>{stats.cotMoc}</strong>
                Journey
              </span>
              <span>
                <strong>{stats.tacPham}</strong>
                Gallery
              </span>
              <span>
                <strong>{stats.banBe}</strong>
                Bạn bè
              </span>
            </div>
            <div className="j-friend-meta">
              {selected.giaiDoan ? <span>{selected.giaiDoan}</span> : null}
              {selected.tinhThanh ? <span>{selected.tinhThanh}</span> : null}
            </div>
          </div>

          <footer className="j-frq-footer">
            {showActions ? (
              <div className="j-frq-actions">
                <button
                  type="button"
                  className="j-frq-btn j-frq-btn--accept"
                  disabled={pending}
                  onClick={() => onRespond(selected, "accept")}
                >
                  <Check size={15} strokeWidth={2.2} aria-hidden />
                  {pending ? "Đang xử lý…" : "Chấp nhận"}
                </button>
                <button
                  type="button"
                  className="j-frq-btn j-frq-btn--decline"
                  disabled={pending}
                  onClick={() => onRespond(selected, "decline")}
                >
                  Từ chối
                </button>
              </div>
            ) : null}
            <Link
              href={`/${encodeURIComponent(selected.slug)}`}
              className="j-frq-journey-link"
              onClick={() => onClose()}
            >
              Xem Journey
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
            </Link>
          </footer>
        </article>
      </div>
    </div>,
    document.body,
  );
}

function Avatar({
  request,
  large = false,
}: {
  request: PendingFollowRequest | CoAuthorReviewProfile;
  large?: boolean;
}) {
  const initial = (request.tenHienThi || request.slug || "?").slice(0, 1).toUpperCase();
  return (
    <span className={large ? "j-notify-avatar is-large" : "j-notify-avatar"}>
      {request.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={request.avatarUrl} alt="" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}
