"use client";

import Link from "next/link";
import { ArrowRight, Bell, Check, CheckCircle2, PencilLine, Video, X, XCircle } from "lucide-react";
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
import { CoSoStaffInviteMessage } from "@/components/journey/CoSoStaffInviteMessage";
import { CongDongInviteMessage } from "@/components/journey/CongDongInviteMessage";
import { JourneyUserFeaturedExpand } from "@/components/journey/JourneyUserFeaturedExpand";
import "./journey-user-popover.css";
import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import { CO_SO_DEFAULT_TAB, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import {
  COAUTHOR_INVITE_ACCEPTED_EVENT,
  COAUTHOR_INVITE_DECLINED_EVENT,
  COAUTHOR_INVITE_FAILED_EVENT,
  type CoAuthorInviteAcceptedDetail,
  type CoAuthorInviteDeclinedDetail,
} from "@/lib/journey/coauthor-invite-events";
import {
  dispatchMilestoneCreditsUpdated,
} from "@/lib/journey/coauthor-credits-events";
import { scheduleWhenIdle } from "@/lib/client/schedule-when-idle";
import {
  EMPTY_NOTIFICATION_HISTORY_FEED,
  NOTIFICATION_LIST_PAGE_SIZE,
  appendHistoryTimeline,
  buildHistoryTimeline,
  buildInfoTimeline,
  parseNotificationFeedPage,
  parseNotificationFeedPayload,
  type HistoryTimelineEntry,
  type InfoTimelineEntry,
} from "@/lib/social/notification-feed-client";
import {
  readHistoryNotificationsCache,
  readUnreadNotificationsCache,
  writeHistoryNotificationsCache,
  writeUnreadNotificationsCache,
} from "@/lib/social/notifications-session-cache";
import type {
  ArticleDongGopFeedbackNotification,
  ArticleDongGopPromotedNotification,
  CommentNotification,
  CoAuthorReviewProfile,
  FollowAcceptedNotification,
  NotificationFeed,
  NotificationFilter,
  OrgMilestoneTagApprovedNotification,
  MembershipMilestoneResolvedNotification,
  PendingCoAuthorInviteNotification,
  PendingCoAuthorReview,
  PendingCoSoStaffInviteNotification,
  PendingCongDongInviteNotification,
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

function coAuthorReviewPostHref(review: {
  ownerSlug: string;
  postSlug: string;
}): string | null {
  if (!review.ownerSlug || !review.postSlug) return null;
  return `/${encodeURIComponent(review.ownerSlug)}/p/${encodeURIComponent(review.postSlug)}`;
}

const EMPTY_HISTORY_FEED = EMPTY_NOTIFICATION_HISTORY_FEED;

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
  if (notice.kind === "mention") {
    if (count > 1) {
      return (
        <>
          <strong>{notice.tenHienThi}</strong> đã gắn thẻ bạn {count} lần trong bình luận.
          <small>{notice.postTitle}</small>
        </>
      );
    }
    return (
      <>
        <strong>{notice.tenHienThi}</strong> đã gắn thẻ bạn trong bình luận.
        <small>{notice.postTitle}</small>
      </>
    );
  }
  if (notice.kind === "reply") {
    if (count > 1) {
      return (
        <>
          <strong>{notice.tenHienThi}</strong> đã trả lời bình luận của bạn {count} lần.
          <small>{notice.postTitle}</small>
        </>
      );
    }
    return (
      <>
        <strong>{notice.tenHienThi}</strong> đã trả lời bình luận của bạn.
        <small>{notice.postTitle}</small>
      </>
    );
  }
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

function orgMilestoneTagNotifyLabel(
  notice: OrgMilestoneTagApprovedNotification,
): ReactNode {
  return (
    <>
      <strong>{notice.orgTen}</strong> đã xác nhận gán tổ chức cho bài viết của bạn
    </>
  );
}

function membershipMilestoneNotifyLabel(
  notice: MembershipMilestoneResolvedNotification,
): ReactNode {
  if (notice.action === "approved") {
    return (
      <>
        <strong>{notice.orgTen}</strong> đã xác thực cột mốc danh tính của bạn
        <small>{notice.milestoneTitle}</small>
      </>
    );
  }
  return (
    <>
      <strong>{notice.orgTen}</strong> đã từ chối yêu cầu xác thực cột mốc
      <small>{notice.milestoneTitle}</small>
    </>
  );
}

function parseFeedPayload(json: unknown): NotificationFeed | null {
  return parseNotificationFeedPayload(json);
}

function countPendingActionItems(feed: NotificationFeed): number {
  return (
    feed.followRequests.length +
    feed.coAuthorInvites.length +
    feed.coAuthorReviews.length +
    feed.coSoStaffInvites.length +
    feed.congDongInvites.length
  );
}

function countDisplayedItems(feed: NotificationFeed): number {
  return (
    feed.followRequests.length +
    feed.accepted.length +
    feed.comments.length +
    feed.coAuthorInvites.length +
    feed.coAuthorReviews.length +
    feed.coSoStaffInvites.length +
    feed.congDongInvites.length +
    feed.orgMilestoneTagApproved.length +
    feed.membershipMilestoneResolved.length +
    feed.videoReady.length +
    feed.dongGopFeedback.length +
    feed.dongGopPromoted.length +
    feed.handledFollows.length +
    feed.processedCoAuthorReviews.length
  );
}

/** Thông báo chỉ cần xem — giữ snapshot khi mở menu để không biến mất sau mark-all. */
type InfoNotificationSnapshot = Pick<
  NotificationFeed,
  | "comments"
  | "accepted"
  | "videoReady"
  | "orgMilestoneTagApproved"
  | "membershipMilestoneResolved"
  | "dongGopFeedback"
  | "dongGopPromoted"
>;

function extractInfoSnapshot(feed: NotificationFeed): InfoNotificationSnapshot {
  return {
    comments: feed.comments,
    accepted: feed.accepted,
    videoReady: feed.videoReady,
    orgMilestoneTagApproved: feed.orgMilestoneTagApproved,
    membershipMilestoneResolved: feed.membershipMilestoneResolved,
    dongGopFeedback: feed.dongGopFeedback,
    dongGopPromoted: feed.dongGopPromoted,
  };
}

function countInfoItems(info: InfoNotificationSnapshot): number {
  return (
    info.comments.length +
    info.accepted.length +
    info.videoReady.length +
    info.orgMilestoneTagApproved.length +
    info.membershipMilestoneResolved.length +
    info.dongGopFeedback.length +
    info.dongGopPromoted.length
  );
}

function removeCoAuthorInviteFromFeed(
  feed: NotificationFeed,
  tacPhamId: string,
): NotificationFeed {
  const coAuthorInvites = feed.coAuthorInvites.filter(
    (invite) => invite.tacPhamId !== tacPhamId,
  );
  if (coAuthorInvites.length === feed.coAuthorInvites.length) return feed;
  return {
    ...feed,
    coAuthorInvites,
    unreadCount: Math.max(0, feed.unreadCount - 1),
  };
}

function renderInfoTimelineEntry(entry: InfoTimelineEntry): ReactNode {
  switch (entry.kind) {
    case "membershipMilestoneResolved":
      return (
        <HistoryInfoItem
          key={entry.item.notificationId}
          href={entry.item.journeyHref}
          label={membershipMilestoneNotifyLabel(entry.item)}
          time={formatNotifyTime(entry.item.taoLuc)}
          avatar={
            <span
              className={`j-notify-avatar${
                entry.item.action === "approved" ? " is-verified" : " is-rejected"
              }`}
              aria-hidden
            >
              {entry.item.action === "approved" ? (
                <CheckCircle2 size={16} strokeWidth={2} />
              ) : (
                <XCircle size={16} strokeWidth={2} />
              )}
            </span>
          }
        />
      );
    case "orgMilestoneTagApproved":
      return (
        <HistoryInfoItem
          key={entry.item.notificationId}
          href={entry.item.albumHref || "#"}
          label={orgMilestoneTagNotifyLabel(entry.item)}
          time={formatNotifyTime(entry.item.taoLuc)}
          avatar={
            <span className="j-notify-avatar is-verified" aria-hidden>
              <CheckCircle2 size={16} strokeWidth={2} />
            </span>
          }
        />
      );
    case "accepted":
      return (
        <HistoryInfoItem
          key={entry.item.notificationId}
          href={`/${entry.item.slug}`}
          label={
            <>
              <strong>{entry.item.tenHienThi}</strong> đã chấp nhận kết bạn.
            </>
          }
          time={formatNotifyTime(entry.item.taoLuc)}
          avatar={<Avatar request={entry.item} />}
        />
      );
    case "comment":
      return (
        <HistoryInfoItem
          key={entry.item.notificationId}
          href={
            entry.item.ownerSlug && entry.item.postSlug
              ? `/${entry.item.ownerSlug}/p/${entry.item.postSlug}`
              : `/${entry.item.slug}`
          }
          label={commentNotifyLabel(entry.item)}
          time={formatNotifyTime(entry.item.taoLuc)}
          avatar={<Avatar request={entry.item} />}
        />
      );
    case "videoReady":
      return (
        <HistoryInfoItem
          key={entry.item.notificationId}
          href={
            entry.item.ownerSlug && entry.item.postSlug
              ? `/${entry.item.ownerSlug}/p/${entry.item.postSlug}`
              : "#"
          }
          label={
            <>
              <strong>Video đã sẵn sàng</strong>
              <small>{entry.item.postTitle}</small>
            </>
          }
          time={formatNotifyTime(entry.item.taoLuc)}
          avatar={
            <span className="j-notify-avatar is-video" aria-hidden>
              <Video size={16} strokeWidth={1.8} />
            </span>
          }
        />
      );
    case "dongGopFeedback":
      return (
        <HistoryInfoItem
          key={entry.item.notificationId}
          href={entry.item.entityHref}
          label={dongGopFeedbackNotifyLabel(entry.item)}
          time={formatNotifyTime(entry.item.taoLuc)}
          avatar={
            <span className="j-notify-avatar is-edit" aria-hidden>
              <PencilLine size={16} strokeWidth={1.8} />
            </span>
          }
        />
      );
    case "dongGopPromoted":
      return (
        <HistoryInfoItem
          key={entry.item.notificationId}
          href={entry.item.entityHref}
          label={dongGopPromotedNotifyLabel(entry.item)}
          time={formatNotifyTime(entry.item.taoLuc)}
          avatar={
            <span className="j-notify-avatar is-verified" aria-hidden>
              <CheckCircle2 size={16} strokeWidth={1.8} />
            </span>
          }
        />
      );
  }
}

function dongGopFeedbackNotifyLabel(
  notice: ArticleDongGopFeedbackNotification,
): ReactNode {
  const title = notice.entityTitle || "bản đóng góp";
  if (notice.action === "tu_choi") {
    return (
      <>
        <strong>Quản trị viên chưa duyệt bản đóng góp</strong>
        <small>
          {title}
          {notice.ghiChu ? ` — ${notice.ghiChu}` : ""}
        </small>
      </>
    );
  }
  return (
    <>
      <strong>Có góp ý cho bản đóng góp của bạn</strong>
      <small>
        {title}
        {notice.ghiChu ? ` — ${notice.ghiChu}` : ""}
      </small>
    </>
  );
}

function dongGopPromotedNotifyLabel(
  notice: ArticleDongGopPromotedNotification,
): ReactNode {
  return (
    <>
      <strong>Bản đóng góp đã được duyệt</strong>
      <small>{notice.entityTitle || "Nội dung chính đã cập nhật"}</small>
    </>
  );
}

function renderHistoryTimelineEntry(entry: HistoryTimelineEntry): ReactNode {
  switch (entry.kind) {
    case "handledFollow":
      return (
        <li key={entry.item.notificationId}>
          <Link href={`/${entry.item.slug}`} className="j-notify-item is-history">
            <Avatar request={entry.item} />
            <span>
              <strong>{entry.item.tenHienThi}</strong>{" "}
              {entry.item.action === "accept"
                ? "— bạn đã chấp nhận kết nối"
                : "— bạn đã từ chối"}
              <small>{formatNotifyTime(entry.item.xuLyLuc)}</small>
            </span>
          </Link>
        </li>
      );
    case "processedCoAuthorReview":
      return (
        <HistoryCoAuthorItem key={entry.item.notificationId} review={entry.item} />
      );
    case "accepted":
    case "comment":
    case "membershipMilestoneResolved":
    case "orgMilestoneTagApproved":
    case "videoReady":
    case "dongGopFeedback":
    case "dongGopPromoted":
      return renderInfoTimelineEntry(entry);
  }
}

export function JourneyNotifications({
  initialUnreadCount,
  viewerProfileId,
}: Props) {
  const cachedUnread = readUnreadNotificationsCache(viewerProfileId);
  const cachedHistory = readHistoryNotificationsCache(viewerProfileId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationFilter>("unread");
  const [selected, setSelected] = useState<PendingFollowRequest | null>(null);
  const [feed, setFeed] = useState<NotificationFeed>(() =>
    cachedUnread
      ? cachedUnread
      : {
          ...EMPTY_HISTORY_FEED,
          unreadCount: initialUnreadCount,
        },
  );
  const [historyFeed, setHistoryFeed] = useState<NotificationFeed | null>(
    () => cachedHistory,
  );
  const [loadingUnread, setLoadingUnread] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryTimelineEntry[]>([]);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyNextOffset, setHistoryNextOffset] = useState(0);
  const [visibleInfoCount, setVisibleInfoCount] = useState(NOTIFICATION_LIST_PAGE_SIZE);
  const [unreadLoaded, setUnreadLoaded] = useState(() => Boolean(cachedUnread));
  const [error, setError] = useState<string | null>(null);
  /** Giữ nội dung info khi panel mở — tránh mất ngay sau PATCH mark_all. */
  const [infoSnapshot, setInfoSnapshot] = useState<InfoNotificationSnapshot | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; right: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const loadingMoreRef = useRef(false);
  const historyNextOffsetRef = useRef(0);
  const historyHasMoreRef = useRef(false);

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
    let removeListeners: (() => void) | undefined;
    /* Đợi sau click mở menu — tránh nuốt cùng một pointerdown/click. */
    const timer = window.setTimeout(() => {
      function isInsideNotifyUi(target: EventTarget | null): boolean {
        if (!(target instanceof Node)) return false;
        if (triggerRef.current?.contains(target)) return true;
        if (menuRef.current?.contains(target)) return true;
        /* Popover người/tổ chức render qua portal ra body (ngoài menuRef).
           Click trong card không được đóng menu — nếu không card sẽ bị unmount
           theo menu ngay khi vừa hiện. */
        if (
          target instanceof Element &&
          target.closest(".j-user-popover-backdrop")
        ) {
          return true;
        }
        return false;
      }
      function onDocPointerDown(event: PointerEvent) {
        if (isInsideNotifyUi(event.target)) return;
        setOpen(false);
      }
      function onKey(event: KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
      }
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

  const applyFeed = useCallback(
    (next: NotificationFeed) => {
      setFeed(next);
      setUnreadLoaded(true);
      writeUnreadNotificationsCache(viewerProfileId, next);
    },
    [viewerProfileId],
  );

  const removeCoAuthorInviteOptimistic = useCallback(
    (tacPhamId: string) => {
      setFeed((prev) => {
        const next = removeCoAuthorInviteFromFeed(prev, tacPhamId);
        if (next === prev) return prev;
        writeUnreadNotificationsCache(viewerProfileId, next);
        return next;
      });
    },
    [viewerProfileId],
  );

  const prefetchUnreadFeed = useCallback(async () => {
    const res = await fetch("/api/notifications?filter=unread", {
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    const next = parseFeedPayload(json);
    if (res.ok && next) {
      applyFeed(next);
      return next;
    }
    return null;
  }, [applyFeed]);

  const prefetchHistoryFeed = useCallback(async () => {
    const res = await fetch(
      `/api/notifications?filter=history&offset=0&limit=${NOTIFICATION_LIST_PAGE_SIZE}`,
      { cache: "no-store" },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok) return null;
    const parsed = parseNotificationFeedPage(json);
    if (!parsed) return null;
    writeHistoryNotificationsCache(viewerProfileId, parsed.feed);
    return parsed.feed;
  }, [viewerProfileId]);

  const fetchUnreadFeed = useCallback(async () => {
    const res = await fetch("/api/notifications?filter=unread", {
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    const next = parseFeedPayload(json);
    if (res.ok && next) applyFeed(next);
    return next;
  }, [applyFeed]);

  /** Chỉ cần xem (bình luận, follow accepted, video, …) → đánh dấu đọc khi mở menu. */
  const dismissInfoNotifications = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          json && typeof json.error === "string"
            ? json.error
            : "Không cập nhật được thông báo.",
        );
        const fallback = await fetch("/api/notifications?filter=unread", {
          cache: "no-store",
        });
        const fallbackJson = await fallback.json().catch(() => null);
        const next = parseFeedPayload(fallbackJson);
        if (fallback.ok && next) applyFeed(next);
        return;
      }
      const next = parseFeedPayload(json);
      if (next) {
        applyFeed(next);
        setHistoryFeed(null);
        void fetch("/api/notifications?filter=history", { cache: "no-store" })
          .then((historyRes) =>
            historyRes.ok ? historyRes.json() : null,
          )
          .then((historyJson) => {
            if (historyJson) {
              const history = parseFeedPayload(historyJson) ?? EMPTY_HISTORY_FEED;
              setHistoryFeed(history);
              writeHistoryNotificationsCache(viewerProfileId, history);
            }
          })
          .catch(() => {
            /* lịch sử load lazy khi chuyển tab */
          });
      }
    } catch {
      setError("Không cập nhật được thông báo.");
    }
  }, [applyFeed, viewerProfileId]);

  const unreadCount = feed.unreadCount;
  const pendingActionCount = useMemo(
    () => countPendingActionItems(feed),
    [feed],
  );
  const activeFeed = tab === "history" && historyFeed ? historyFeed : feed;

  const displayedPendingCount = useMemo(
    () => countPendingActionItems(activeFeed),
    [activeFeed],
  );

  const unreadInfoItems = useMemo((): InfoNotificationSnapshot => {
    if (open && infoSnapshot) return infoSnapshot;
    return extractInfoSnapshot(activeFeed);
  }, [open, infoSnapshot, activeFeed]);

  const displayedInfoCount = useMemo(() => {
    if (tab !== "unread") return 0;
    return countInfoItems(unreadInfoItems);
  }, [tab, unreadInfoItems]);

  const loadHistory = useCallback(
    async (reset = true) => {
      if (reset) {
        setHistoryEntries([]);
        setHistoryNextOffset(0);
        setHistoryHasMore(false);
        historyNextOffsetRef.current = 0;
        historyHasMoreRef.current = false;
        setLoadingHistory(true);
      }
      try {
        const offset = reset ? 0 : historyNextOffsetRef.current;
        const res = await fetch(
          `/api/notifications?filter=history&offset=${offset}&limit=${NOTIFICATION_LIST_PAGE_SIZE}`,
          { cache: "no-store" },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          if (reset) {
            setHistoryFeed(EMPTY_HISTORY_FEED);
            setHistoryEntries([]);
          }
          setError(
            json && typeof json.error === "string"
              ? json.error
              : "Không tải được lịch sử thông báo.",
          );
          return;
        }
        const parsed = parseNotificationFeedPage(json);
        if (!parsed) return;
        const timeline = buildHistoryTimeline(parsed.feed);
        if (reset) {
          setHistoryFeed(parsed.feed);
          setHistoryEntries(timeline);
          writeHistoryNotificationsCache(viewerProfileId, parsed.feed);
        } else {
          setHistoryEntries((prev) => appendHistoryTimeline(prev, timeline));
        }
        setHistoryHasMore(parsed.hasMore);
        setHistoryNextOffset(parsed.nextOffset);
        historyHasMoreRef.current = parsed.hasMore;
        historyNextOffsetRef.current = parsed.nextOffset;
      } finally {
        if (reset) setLoadingHistory(false);
      }
    },
    [viewerProfileId],
  );

  const loadMoreHistory = useCallback(async () => {
    if (!historyHasMoreRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMoreHistory(true);
    try {
      await loadHistory(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreHistory(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    const cancelIdle = scheduleWhenIdle(() => {
      void prefetchUnreadFeed().catch(() => {
        /* giữ cache/badge hiện tại */
      });
      void prefetchHistoryFeed()
        .then((next) => {
          if (next) setHistoryFeed(next);
        })
        .catch(() => {
          /* lịch sử load khi chuyển tab */
        });
    });
    return cancelIdle;
  }, [prefetchHistoryFeed, prefetchUnreadFeed]);

  useEffect(() => {
    if (unreadLoaded) return;
    void fetchUnreadFeed().catch(() => {
      /* giữ badge hiện tại, thử lại khi mở menu */
    });
  }, [feed.unreadCount, unreadLoaded, fetchUnreadFeed]);

  useEffect(() => {
    if (!open) {
      setInfoSnapshot(null);
      return;
    }

    let cancelled = false;
    setLoadingUnread(true);

    void (async () => {
      try {
        const loaded = await fetchUnreadFeed();
        if (cancelled) return;
        if (loaded) setInfoSnapshot(extractInfoSnapshot(loaded));
        await dismissInfoNotifications();
      } finally {
        if (!cancelled) setLoadingUnread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, fetchUnreadFeed, dismissInfoNotifications]);

  useEffect(() => {
    if (!open || tab !== "history") return;
    if (historyEntries.length > 0 || loadingHistory) return;
    void loadHistory(true);
  }, [open, tab, historyEntries.length, loadingHistory, loadHistory]);

  useEffect(() => {
    if (open) return;
    setHistoryEntries([]);
    setHistoryHasMore(false);
    setHistoryNextOffset(0);
    historyHasMoreRef.current = false;
    historyNextOffsetRef.current = 0;
    setVisibleInfoCount(NOTIFICATION_LIST_PAGE_SIZE);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setVisibleInfoCount(NOTIFICATION_LIST_PAGE_SIZE);
  }, [open, tab]);

  const refreshUnread = useCallback(() => {
    void fetchUnreadFeed().catch(() => {
      /* giữ state hiện tại */
    });
  }, [fetchUnreadFeed]);

  useEffect(() => {
    const onCoAuthorAccepted = (event: Event) => {
      const tacPhamId = (event as CustomEvent<CoAuthorInviteAcceptedDetail>).detail
        ?.tacPhamId;
      if (tacPhamId) removeCoAuthorInviteOptimistic(tacPhamId);
    };
    const onCoAuthorDeclined = (event: Event) => {
      const tacPhamId = (event as CustomEvent<CoAuthorInviteDeclinedDetail>).detail
        ?.tacPhamId;
      if (tacPhamId) removeCoAuthorInviteOptimistic(tacPhamId);
    };
    const onCoAuthorFailed = () => {
      void fetchUnreadFeed().catch(() => {
        /* khôi phục từ server */
      });
    };
    window.addEventListener(COAUTHOR_INVITE_ACCEPTED_EVENT, onCoAuthorAccepted);
    window.addEventListener(COAUTHOR_INVITE_DECLINED_EVENT, onCoAuthorDeclined);
    window.addEventListener(COAUTHOR_INVITE_FAILED_EVENT, onCoAuthorFailed);
    return () => {
      window.removeEventListener(COAUTHOR_INVITE_ACCEPTED_EVENT, onCoAuthorAccepted);
      window.removeEventListener(
        COAUTHOR_INVITE_DECLINED_EVENT,
        onCoAuthorDeclined,
      );
      window.removeEventListener(COAUTHOR_INVITE_FAILED_EVENT, onCoAuthorFailed);
    };
  }, [fetchUnreadFeed, removeCoAuthorInviteOptimistic]);

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
      if (tab === "history") void loadHistory(true);
    });
  };

  const respondCoAuthorInvite = (
    invite: PendingCoAuthorInviteNotification,
    action: "accepted" | "declined",
  ) => {
    setError(null);
    removeCoAuthorInviteOptimistic(invite.tacPhamId);
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
        void fetchUnreadFeed().catch(() => {
          /* khôi phục từ server */
        });
        return;
      }
      window.dispatchEvent(new Event("cins:notifications-changed"));
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
      if (
        action === "accept" &&
        typeof json.tacPhamId === "string" &&
        Array.isArray(json.coAuthorCredits)
      ) {
        dispatchMilestoneCreditsUpdated({
          tacPhamId: json.tacPhamId,
          coAuthorCredits: json.coAuthorCredits as CoAuthorCredit[],
        });
      }
      if (tab === "history") void loadHistory(true);
    });
  };

  const respondCoSoStaffInvite = (
    invite: PendingCoSoStaffInviteNotification,
    action: "accept" | "decline",
  ) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(invite.orgId)}/members/${encodeURIComponent(invite.membershipId)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
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
      window.dispatchEvent(new Event("cins:notifications-changed"));
    });
  };

  const respondCongDongInvite = (
    invite: PendingCongDongInviteNotification,
    action: "accept" | "decline",
  ) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/cong-dong/invites/${encodeURIComponent(invite.notificationId)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
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
      window.dispatchEvent(new Event("cins:notifications-changed"));
    });
  };

  const selectedStillPending = useMemo(
    () => selected && feed.followRequests.some((r) => r.idNguoiDung === selected.idNguoiDung),
    [feed.followRequests, selected],
  );

  const historyTimeline = historyEntries;

  const unreadInfoTimeline = useMemo(
    () => (tab === "unread" ? buildInfoTimeline(unreadInfoItems) : []),
    [tab, unreadInfoItems],
  );

  const visibleInfoTimeline = useMemo(
    () => unreadInfoTimeline.slice(0, visibleInfoCount),
    [unreadInfoTimeline, visibleInfoCount],
  );

  const hasMoreInfo = visibleInfoCount < unreadInfoTimeline.length;

  const listCount =
    tab === "unread"
      ? unreadLoaded
        ? displayedPendingCount + displayedInfoCount
        : pendingActionCount
      : historyEntries.length;

  const showMoreHint =
    tab === "unread" && unreadLoaded && pendingActionCount > displayedPendingCount;

  const canLoadMoreList =
    tab === "history" ? historyHasMore : tab === "unread" && hasMoreInfo;

  useEffect(() => {
    if (!open || !canLoadMoreList) return;
    const root = listRef.current;
    const node = sentinelRef.current;
    if (!root || !node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (tab === "history") {
          void loadMoreHistory();
          return;
        }
        setVisibleInfoCount((count) =>
          Math.min(count + NOTIFICATION_LIST_PAGE_SIZE, unreadInfoTimeline.length),
        );
      },
      { root, rootMargin: "48px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    open,
    tab,
    canLoadMoreList,
    loadMoreHistory,
    unreadInfoTimeline.length,
    historyEntries.length,
    visibleInfoCount,
  ]);

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
            <span>
              {tab === "unread"
                ? `${pendingActionCount} chưa xử lý`
                : `${listCount} đã xử lý`}
            </span>
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
              {pendingActionCount > 0 ? <em>{pendingActionCount}</em> : null}
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

          {(tab === "unread" && loadingUnread) ||
          (tab === "history" && loadingHistory) ? (
            <p className="j-notify-empty">Đang tải…</p>
          ) : listCount === 0 ? (
            <p className="j-notify-empty">
              {tab === "unread"
                ? "Không có thông báo cần xử lý."
                : "Chưa có lịch sử. Lịch sử gồm: kết nối đã chấp nhận/từ chối, ai đó chấp nhận kết bạn với bạn, bình luận/video đã đọc."}
            </p>
          ) : (
            <ul ref={listRef} className="j-notify-list">
              {tab === "unread" ? (
                <>
                  {activeFeed.congDongInvites.map((invite) => (
                    <li key={invite.notificationId}>
                      <div className="j-notify-item is-coauthor-invite j-notify-item--cong-dong">
                        <CongDongInviteMessage
                          inviterName={invite.inviterName}
                          inviterSlug={invite.inviterSlug}
                          inviterAvatarUrl={invite.inviterAvatarUrl}
                          orgTen={invite.orgTen}
                          orgSlug={invite.orgSlug}
                          className="j-coauthor-invite-message j-notify-coauthor-invite-text"
                        />
                        <div className="j-notify-inline-actions">
                          <Link
                            href={`/cong-dong/${encodeURIComponent(invite.orgSlug)}`}
                            className="j-notify-mini-action is-link"
                          >
                            Xem cộng đồng
                          </Link>
                          <button
                            type="button"
                            className="j-notify-mini-action is-accept"
                            disabled={pending}
                            onClick={() => respondCongDongInvite(invite, "accept")}
                          >
                            Tham gia
                          </button>
                          <button
                            type="button"
                            className="j-notify-mini-action"
                            disabled={pending}
                            onClick={() => respondCongDongInvite(invite, "decline")}
                          >
                            Bỏ qua
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {activeFeed.coSoStaffInvites.map((invite) => (
                    <li key={invite.notificationId}>
                      <div className="j-notify-item is-coauthor-invite j-notify-item--cso-staff">
                        <CoSoStaffInviteMessage
                          inviterName={invite.inviterName}
                          inviterSlug={invite.inviterSlug}
                          inviterAvatarUrl={invite.inviterAvatarUrl}
                          orgTen={invite.orgTen}
                          orgSlug={invite.orgSlug}
                          vaiTroLabel={invite.vaiTroLabel}
                          className="j-coauthor-invite-message j-notify-coauthor-invite-text"
                        />
                        <div className="j-notify-inline-actions">
                          <Link
                            href={coSoTabPath(invite.orgSlug, CO_SO_DEFAULT_TAB)}
                            className="j-notify-mini-action is-link"
                          >
                            Xem cơ sở
                          </Link>
                          <button
                            type="button"
                            className="j-notify-mini-action is-accept"
                            disabled={pending}
                            onClick={() => respondCoSoStaffInvite(invite, "accept")}
                          >
                            Chấp nhận
                          </button>
                          <button
                            type="button"
                            className="j-notify-mini-action"
                            disabled={pending}
                            onClick={() => respondCoSoStaffInvite(invite, "decline")}
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {activeFeed.coAuthorInvites.map((invite) => {
                    const postHref = coAuthorPostHref(invite);
                    return (
                      <li key={invite.notificationId}>
                        <div className="j-notify-item is-coauthor-invite">
                          <CoAuthorInviteMessage
                            ownerSlug={invite.ownerSlug}
                            ownerName={invite.ownerName}
                            ownerAvatarUrl={invite.ownerAvatarUrl}
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
                      <CoAuthorReviewNotifyItem
                        review={review}
                        pending={pending}
                        onAccept={() => respondCoAuthorReview(review, "accept")}
                        onDecline={() => respondCoAuthorReview(review, "decline")}
                      />
                    </li>
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
                  {visibleInfoTimeline.map((entry) => renderInfoTimelineEntry(entry))}
                </>
              ) : (
                <>
                  {historyTimeline.map((entry) => renderHistoryTimelineEntry(entry))}
                </>
              )}
              {canLoadMoreList ? (
                <li ref={sentinelRef} className="j-notify-list-sentinel" aria-hidden />
              ) : null}
              {loadingMoreHistory ? (
                <li className="j-notify-list-loading">Đang tải thêm…</li>
              ) : null}
            </ul>
          )}
          {showMoreHint ? (
            <p className="j-notify-more-hint">
              Hiển thị {displayedPendingCount} / {pendingActionCount} thông báo cần xử lý.
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
        onClick={() => setOpen((v) => !v)}
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

function CoAuthorReviewNotifyItem({
  review,
  pending,
  onAccept,
  onDecline,
}: {
  review: PendingCoAuthorReview;
  pending: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const postHref = coAuthorReviewPostHref(review);

  return (
    <div className="j-notify-item is-coauthor-review">
      <div className="j-notify-coauthor-review-lead">
        <Avatar request={review.proposer} />
        <p>
          <strong>{review.proposer.tenHienThi}</strong> đề xuất thêm cộng sự
        </p>
      </div>

      <div className="j-notify-coauthor-review-people">
        <CoAuthorReviewPersonRow
          profile={review.target}
          label="Người được đề xuất"
          role={review.vaiTro || null}
          showProfileLink
        />
      </div>

      <p className="j-notify-coauthor-review-post">
        Bài viết:{" "}
        {postHref ? (
          <Link href={postHref} className="j-notify-coauthor-review-post-link">
            {review.postTitle}
          </Link>
        ) : (
          <strong>{review.postTitle}</strong>
        )}
      </p>

      <div className="j-notify-coauthor-review-actions">
        <button
          type="button"
          className="j-notify-mini-action is-accept"
          disabled={pending}
          onClick={onAccept}
        >
          Duyệt
        </button>
        <button
          type="button"
          className="j-notify-mini-action"
          disabled={pending}
          onClick={onDecline}
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}

function CoAuthorReviewPersonRow({
  profile,
  label,
  role,
  showProfileLink = false,
}: {
  profile: CoAuthorReviewProfile;
  label: string;
  role?: string | null;
  showProfileLink?: boolean;
}) {
  return (
    <div className="j-notify-coauthor-person">
      <Avatar request={profile} />
      <div className="j-notify-coauthor-person-copy">
        <span className="j-notify-coauthor-person-label">{label}</span>
        <strong>{profile.tenHienThi}</strong>
        <span className="j-notify-coauthor-person-slug">@{profile.slug}</span>
        {role ? (
          <span className="j-notify-coauthor-person-role">Vai trò: {role}</span>
        ) : null}
      </div>
      {showProfileLink ? (
        <Link
          href={`/${encodeURIComponent(profile.slug)}`}
          className="j-notify-mini-action is-link j-notify-coauthor-person-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Xem
        </Link>
      ) : null}
    </div>
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
          <X size={14} aria-hidden />
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
          <div className="j-friend-body">
            <div className="j-friend-avatar">
              {selected.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.avatarUrl} alt="" />
              ) : (
                <span>{(selected.tenHienThi || selected.slug).slice(0, 1)}</span>
              )}
            </div>
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
          <JourneyUserFeaturedExpand slug={selected.slug} />
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
