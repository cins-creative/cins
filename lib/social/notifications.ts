import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  listPendingCoAuthorInviteNotifications,
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

/** Số dòng tối đa hiển thị trong dropdown thông báo. */
export const NOTIFICATION_DISPLAY_LIMIT = 10;

type FeedPayload = Omit<NotificationFeed, "unreadCount">;

export const EMPTY_NOTIFICATION_FEED: NotificationFeed = {
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

export type LoadNotificationFeedOptions = {
  displayLimit?: number;
};

function capUnreadLists(payload: FeedPayload, limit: number): FeedPayload {
  let left = limit;
  const take = <T>(arr: T[]): T[] => {
    if (left <= 0) return [];
    const slice = arr.slice(0, left);
    left -= slice.length;
    return slice;
  };
  return {
    followRequests: take(payload.followRequests),
    coAuthorInvites: take(payload.coAuthorInvites),
    coAuthorReviews: take(payload.coAuthorReviews),
    videoReady: take(payload.videoReady),
    comments: take(payload.comments),
    accepted: take(payload.accepted),
    handledFollows: [],
    processedCoAuthorReviews: [],
  };
}

function capHistoryLists(payload: FeedPayload, limit: number): FeedPayload {
  let left = limit;
  const take = <T>(arr: T[]): T[] => {
    if (left <= 0) return [];
    const slice = arr.slice(0, left);
    left -= slice.length;
    return slice;
  };
  return {
    followRequests: [],
    coAuthorInvites: [],
    coAuthorReviews: [],
    handledFollows: take(payload.handledFollows),
    processedCoAuthorReviews: take(payload.processedCoAuthorReviews),
    accepted: take(payload.accepted),
    comments: take(payload.comments),
    videoReady: take(payload.videoReady),
  };
}

export async function loadNotificationFeed(
  viewerId: string,
  filter: NotificationFilter,
  options: LoadNotificationFeedOptions = {},
): Promise<NotificationFeed> {
  try {
    return await loadNotificationFeedUnsafe(viewerId, filter, options);
  } catch (error) {
    console.error("[loadNotificationFeed]", error);
    return { ...EMPTY_NOTIFICATION_FEED };
  }
}

async function loadNotificationFeedUnsafe(
  viewerId: string,
  filter: NotificationFilter,
  options: LoadNotificationFeedOptions = {},
): Promise<NotificationFeed> {
  const unreadOnly = filter === "unread";
  const historyOnly = filter === "history";
  const displayLimit = options.displayLimit ?? NOTIFICATION_DISPLAY_LIMIT;
  const rowLimit = displayLimit;

  const [
    unreadCount,
    followRequests,
    accepted,
    comments,
    coAuthorInvites,
    coAuthorReviews,
    videoReady,
    handledFollows,
    processedCoAuthorReviews,
  ] = await Promise.all([
    unreadOnly ? countUnreadNotifications(viewerId) : Promise.resolve(0),
    unreadOnly
      ? listPendingReceived(viewerId, { limit: rowLimit })
      : Promise.resolve([]),
    listFollowAcceptedNotifications(viewerId, {
      unreadOnly,
      historyOnly,
      limit: rowLimit,
    }),
    listCommentNotifications(viewerId, {
      unreadOnly,
      historyOnly,
      limit: rowLimit,
    }),
    unreadOnly
      ? listPendingCoAuthorInviteNotifications(viewerId, { limit: rowLimit })
      : Promise.resolve([]),
    unreadOnly
      ? listPendingCoAuthorReviews(viewerId, { limit: rowLimit })
      : Promise.resolve([]),
    listVideoReadyNotifications(viewerId, {
      unreadOnly,
      historyOnly,
      limit: rowLimit,
    }),
    historyOnly
      ? listFollowHandledNotifications(viewerId, { limit: rowLimit })
      : Promise.resolve([]),
    historyOnly
      ? listProcessedCoAuthorReviews(viewerId, { limit: rowLimit })
      : Promise.resolve([]),
  ]);

  const raw: FeedPayload = {
    followRequests,
    accepted,
    comments,
    coAuthorInvites: unreadOnly ? coAuthorInvites : [],
    coAuthorReviews: unreadOnly ? coAuthorReviews : [],
    videoReady,
    handledFollows,
    processedCoAuthorReviews: historyOnly ? processedCoAuthorReviews : [],
  };

  const payload =
    filter === "unread"
      ? capUnreadLists(raw, displayLimit)
      : capHistoryLists(raw, displayLimit);

  if (filter === "unread") {
    return { unreadCount, ...payload };
  }

  return { unreadCount: 0, ...payload };
}

/** Đếm badge — head count, không hydrate profile. */
export async function countUnreadNotifications(viewerId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const [
    { count: pendingFriends },
    { count: accepted },
    { count: comments },
    { count: coAuthorInvite },
    { count: coAuthorReview },
    { count: video },
  ] = await Promise.all([
    admin
      .from("user_ket_ban")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_nhan", viewerId)
      .eq("trang_thai", "pending"),
    admin
      .from("social_thong_bao")
      .select("id", { count: "exact", head: true })
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "follow_accepted")
      .eq("da_doc", false),
    admin
      .from("social_thong_bao")
      .select("id", { count: "exact", head: true })
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "cot_moc_comment")
      .eq("da_doc", false),
    admin
      .from("social_thong_bao")
      .select("id", { count: "exact", head: true })
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "tac_gia_invite")
      .eq("da_doc", false)
      .is("xu_ly_luc", null),
    admin
      .from("social_thong_bao")
      .select("id", { count: "exact", head: true })
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "tac_gia_owner_review")
      .is("xu_ly_luc", null),
    admin
      .from("social_thong_bao")
      .select("id", { count: "exact", head: true })
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "video_ready")
      .eq("da_doc", false),
  ]);

  return (
    (pendingFriends ?? 0) +
    (accepted ?? 0) +
    (comments ?? 0) +
    (coAuthorInvite ?? 0) +
    (coAuthorReview ?? 0) +
    (video ?? 0)
  );
}

async function resolveMilestoneIdForCommentNotify(
  admin: ReturnType<typeof createServiceRoleClient>,
  objectId: string,
): Promise<string | null> {
  const { data: milestone } = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id", objectId)
    .maybeSingle<{ id: string }>();
  if (milestone?.id) return milestone.id;

  const { data: comment } = await admin
    .from("social_binh_luan")
    .select("id_doi_tuong")
    .eq("id", objectId)
    .eq("loai_doi_tuong", "cot_moc")
    .maybeSingle<{ id_doi_tuong: string }>();
  return comment?.id_doi_tuong ?? null;
}

/** Gộp đánh dấu đọc: 1 thông báo bình luận = cả chuỗi chưa đọc cùng người × bài. */
async function expandCommentNotificationReadIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  viewerId: string,
  notificationIds: string[],
): Promise<string[]> {
  const result = new Set(notificationIds);
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, loai_doi_tuong, id_doi_tuong, noi_dung_ai")
    .eq("nguoi_nhan", viewerId)
    .in("id", notificationIds);

  for (const row of rows ?? []) {
    if (row.loai_doi_tuong !== "cot_moc_comment") continue;
    const commenterId = row.noi_dung_ai as string | null;
    const objectId = row.id_doi_tuong as string | null;
    if (!commenterId || !objectId) continue;

    const milestoneId = await resolveMilestoneIdForCommentNotify(admin, objectId);
    if (!milestoneId) continue;

    const { data: commentIds } = await admin
      .from("social_binh_luan")
      .select("id")
      .eq("loai_doi_tuong", "cot_moc")
      .eq("id_doi_tuong", milestoneId)
      .eq("nguoi_binh_luan", commenterId)
      .returns<Array<{ id: string }>>();

    const objectIds = [
      milestoneId,
      ...(commentIds ?? []).map((comment) => comment.id),
    ];

    const { data: related } = await admin
      .from("social_thong_bao")
      .select("id")
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "cot_moc_comment")
      .eq("noi_dung_ai", commenterId)
      .eq("da_doc", false)
      .in("id_doi_tuong", objectIds)
      .returns<Array<{ id: string }>>();

    for (const relatedRow of related ?? []) {
      result.add(relatedRow.id);
    }
  }

  return [...result];
}

export async function markNotificationsRead(
  viewerId: string,
  notificationIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (notificationIds.length === 0) return { ok: true };
  const admin = createServiceRoleClient();
  const expandedIds = await expandCommentNotificationReadIds(
    admin,
    viewerId,
    notificationIds,
  );
  const { error } = await admin
    .from("social_thong_bao")
    .update({ da_doc: true })
    .eq("nguoi_nhan", viewerId)
    .in("id", expandedIds);
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
