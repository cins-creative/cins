"use client";

import Link from "next/link";
import { Bell, Check, ExternalLink, Video, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import type {
  CommentNotification,
  CoAuthorReviewProfile,
  FollowAcceptedNotification,
  NotificationFeed,
  NotificationFilter,
  PendingCoAuthorReview,
  PendingFollowRequest,
  ProcessedCoAuthorReview,
  VideoReadyNotification,
} from "@/lib/social/types";

type Props = {
  initialFeed: NotificationFeed;
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

function parseFeedPayload(json: unknown): NotificationFeed | null {
  if (!json || typeof json !== "object") return null;
  const data = json as NotificationFeed;
  if (!Array.isArray(data.followRequests)) return null;
  return data;
}

export function JourneyNotifications({ initialFeed }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationFilter>("unread");
  const [selected, setSelected] = useState<PendingFollowRequest | null>(null);
  const [feed, setFeed] = useState<NotificationFeed>(initialFeed);
  const [historyFeed, setHistoryFeed] = useState<NotificationFeed | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyFeed = useCallback((next: NotificationFeed) => {
    setFeed(next);
  }, []);

  const unreadCount = feed.unreadCount;
  const activeFeed = tab === "history" && historyFeed ? historyFeed : feed;

  const historyCount = useMemo(() => {
    if (!historyFeed) return null;
    return (
      historyFeed.accepted.length +
      historyFeed.comments.length +
      historyFeed.videoReady.length +
      historyFeed.handledFollows.length +
      historyFeed.processedCoAuthorReviews.length
    );
  }, [historyFeed]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/notifications?filter=history", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setHistoryFeed(parseFeedPayload(json));
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "history" && !historyFeed && !loadingHistory) {
      void loadHistory();
    }
  }, [open, tab, historyFeed, loadingHistory, loadHistory]);

  useEffect(() => {
    const refreshUnread = () => {
      void fetch("/api/notifications?filter=unread", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: NotificationFeed | null) => {
          if (json) applyFeed(json);
        })
        .catch(() => {
          /* giữ state hiện tại */
        });
    };
    window.addEventListener("cins:video-ready", refreshUnread);
    return () => window.removeEventListener("cins:video-ready", refreshUnread);
  }, [applyFeed]);

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
    startTransition(async () => {
      const res = await fetch("/api/follow/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_nguoi_dung: request.idNguoiDung,
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
      setSelected(null);
      if (tab === "history") void loadHistory();
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
      ? unreadCount
      : historyCount ?? 0;

  const title =
    unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo mới";

  return (
    <div className="j-notify">
      <button
        type="button"
        className={`j-notify-trigger${unreadCount > 0 ? " has-unread" : ""}`}
        aria-expanded={open}
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} strokeWidth={1.9} aria-hidden />
        {unreadCount > 0 ? <span className="j-notify-count">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="j-notify-menu">
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

          {tab === "history" && loadingHistory ? (
            <p className="j-notify-empty">Đang tải lịch sử…</p>
          ) : listCount === 0 ? (
            <p className="j-notify-empty">
              {tab === "unread"
                ? "Không có thông báo cần xử lý."
                : "Chưa có thông báo đã xử lý."}
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
                      label={
                        <>
                          <strong>{notice.tenHienThi}</strong> đã bình luận bài viết.
                          <small>{notice.postTitle}</small>
                        </>
                      }
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
          {error ? (
            <p className="j-notify-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

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
        <span>
          <strong>{notice.tenHienThi}</strong> đã bình luận bài viết.
          <small>{notice.postTitle}</small>
        </span>
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
  return (
    <div
      className="j-notify-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="j-notify-modal j-notify-profile-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Thông tin ${selected.tenHienThi}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="j-notify-modal-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={16} aria-hidden />
        </button>
        <div
          className={`j-notify-cover${selected.coverUrl ? " has-img" : ""}`}
          aria-hidden
        >
          {selected.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.coverUrl} alt="" />
          ) : (
            <span />
          )}
        </div>
        <div className="j-notify-profile-main">
          <Avatar request={selected} large />
          <div className="j-notify-profile-title">
            <h2>{selected.tenHienThi}</h2>
            <p className="j-notify-modal-slug">@{selected.slug}</p>
          </div>
        </div>
        <div className="j-notify-stats" aria-label="Tổng quan hồ sơ">
          <span>
            <strong>{selected.stats.cotMoc}</strong>
            Cột mốc
          </span>
          <span>
            <strong>{selected.stats.tacPham}</strong>
            Tác phẩm
          </span>
          <span>
            <strong>{selected.stats.banBe}</strong>
            Bạn bè
          </span>
          <span>
            <strong>{selected.stats.toChucXacThuc}</strong>
            Xác thực
          </span>
        </div>
        {selected.bio ? <p className="j-notify-modal-bio">{selected.bio}</p> : null}
        <dl className="j-notify-modal-meta">
          {selected.giaiDoan ? (
            <div>
              <dt>Giai đoạn</dt>
              <dd>{selected.giaiDoan}</dd>
            </div>
          ) : null}
          {selected.tinhThanh ? (
            <div>
              <dt>Khu vực</dt>
              <dd>{selected.tinhThanh}</dd>
            </div>
          ) : null}
        </dl>
        <div className="j-notify-modal-actions">
          {showActions ? (
            <>
              <button
                type="button"
                className="j-notify-action is-accept"
                disabled={pending}
                onClick={() => onRespond(selected, "accept")}
              >
                <Check size={14} aria-hidden /> Duyệt
              </button>
              <button
                type="button"
                className="j-notify-action"
                disabled={pending}
                onClick={() => onRespond(selected, "decline")}
              >
                Từ chối
              </button>
            </>
          ) : null}
          <Link href={`/${selected.slug}`} className="j-notify-action is-link">
            <ExternalLink size={14} aria-hidden /> Xem Journey
          </Link>
        </div>
      </div>
    </div>
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
