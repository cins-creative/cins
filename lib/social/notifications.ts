import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  listProcessedCoAuthorReviews,
  listPendingCoAuthorReviews,
} from "@/lib/social/co-author";
import {
  listCommentNotifications,
  listFollowAcceptedNotifications,
  listFollowHandledNotifications,
} from "@/lib/social/follow";
import { listPendingReceived } from "@/lib/social/ket-ban";
import type { NotificationFeed, NotificationFilter } from "@/lib/social/types";
import { listVideoReadyNotifications } from "@/lib/social/video-ready";

function countUnread(feed: Omit<NotificationFeed, "unreadCount">): number {
  return (
    feed.followRequests.length +
    feed.accepted.length +
    feed.comments.length +
    feed.coAuthorReviews.length +
    feed.videoReady.length
  );
}

export const EMPTY_NOTIFICATION_FEED: NotificationFeed = {
  unreadCount: 0,
  followRequests: [],
  accepted: [],
  comments: [],
  coAuthorReviews: [],
  videoReady: [],
  handledFollows: [],
  processedCoAuthorReviews: [],
};

export async function loadNotificationFeed(
  viewerId: string,
  filter: NotificationFilter,
): Promise<NotificationFeed> {
  try {
    return await loadNotificationFeedUnsafe(viewerId, filter);
  } catch (error) {
    console.error("[loadNotificationFeed]", error);
    return { ...EMPTY_NOTIFICATION_FEED };
  }
}

async function loadNotificationFeedUnsafe(
  viewerId: string,
  filter: NotificationFilter,
): Promise<NotificationFeed> {
  const unreadOnly = filter === "unread";
  const historyOnly = filter === "history";

  const [
    followRequests,
    accepted,
    comments,
    coAuthorReviews,
    videoReady,
    handledFollows,
    processedCoAuthorReviews,
  ] = await Promise.all([
    unreadOnly ? listPendingReceived(viewerId) : Promise.resolve([]),
    listFollowAcceptedNotifications(viewerId, { unreadOnly, historyOnly }),
    listCommentNotifications(viewerId, { unreadOnly, historyOnly }),
    unreadOnly ? listPendingCoAuthorReviews(viewerId) : Promise.resolve([]),
    listVideoReadyNotifications(viewerId, { unreadOnly, historyOnly }),
    historyOnly ? listFollowHandledNotifications(viewerId) : Promise.resolve([]),
    historyOnly ? listProcessedCoAuthorReviews(viewerId) : Promise.resolve([]),
  ]);

  const payload = {
    followRequests,
    accepted,
    comments,
    coAuthorReviews: unreadOnly ? coAuthorReviews : [],
    videoReady,
    handledFollows,
    processedCoAuthorReviews: historyOnly ? processedCoAuthorReviews : [],
  };

  if (filter === "unread") {
    return { unreadCount: countUnread(payload), ...payload };
  }

  return { unreadCount: 0, ...payload };
}

/** Đếm badge — không load profile đầy đủ. */
export async function countUnreadNotifications(viewerId: string): Promise<number> {
  const feed = await loadNotificationFeed(viewerId, "unread");
  return feed.unreadCount;
}

export async function markNotificationsRead(
  viewerId: string,
  notificationIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (notificationIds.length === 0) return { ok: true };
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("social_thong_bao")
    .update({ da_doc: true })
    .eq("nguoi_nhan", viewerId)
    .in("id", notificationIds);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markAllInfoNotificationsRead(
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("social_thong_bao")
    .update({ da_doc: true })
    .eq("nguoi_nhan", viewerId)
    .eq("da_doc", false)
    .in("loai_doi_tuong", [
      "follow_accepted",
      "cot_moc_comment",
      "video_ready",
    ]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
