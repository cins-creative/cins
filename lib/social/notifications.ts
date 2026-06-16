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
import { listPendingCoSoStaffInviteNotifications } from "@/lib/to-chuc/co-so-staff-invite";
import type { NotificationFeed, NotificationFilter } from "@/lib/social/types";
import { listOrgMilestoneTagApprovedNotifications } from "@/lib/social/org-milestone-tag-notify";
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
  coSoStaffInvites: [],
  videoReady: [],
  orgMilestoneTagApproved: [],
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
    coSoStaffInvites: take(payload.coSoStaffInvites),
    orgMilestoneTagApproved: [],
    followRequests: take(payload.followRequests),
    coAuthorInvites: take(payload.coAuthorInvites),
    coAuthorReviews: take(payload.coAuthorReviews),
    videoReady: [],
    comments: [],
    accepted: [],
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
    coSoStaffInvites: [],
    handledFollows: take(payload.handledFollows),
    processedCoAuthorReviews: take(payload.processedCoAuthorReviews),
    accepted: take(payload.accepted),
    orgMilestoneTagApproved: take(payload.orgMilestoneTagApproved),
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
    coSoStaffInvites,
    orgMilestoneTagApproved,
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
    unreadOnly
      ? listPendingCoSoStaffInviteNotifications(viewerId, { limit: rowLimit })
      : Promise.resolve([]),
    listOrgMilestoneTagApprovedNotifications(viewerId, {
      unreadOnly,
      historyOnly,
      limit: rowLimit,
    }),
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
    coSoStaffInvites: unreadOnly ? coSoStaffInvites : [],
    orgMilestoneTagApproved,
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
    { count: commentReplies },
    { count: commentMentions },
    { count: coAuthorInvite },
    { count: coAuthorReview },
    { count: coSoStaffInvite },
    { count: coSoStaffMembershipPending },
    { count: orgMilestoneTag },
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
      .eq("loai_doi_tuong", "binh_luan_tra_loi")
      .eq("da_doc", false),
    admin
      .from("social_thong_bao")
      .select("id", { count: "exact", head: true })
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "mention_binh_luan")
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
      .eq("loai_doi_tuong", "co_so_staff_invite")
      .is("xu_ly_luc", null),
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", viewerId)
      .eq("trang_thai", "pending")
      .in("vai_tro", [
        "admin",
        "quan_ly_noi_dung",
        "quan_ly_tuyen_sinh",
        "giao_vien",
        "nhan_vien",
      ]),
    admin
      .from("social_thong_bao")
      .select("id", { count: "exact", head: true })
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", "org_milestone_tag_approved")
      .eq("da_doc", false),
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
    (commentReplies ?? 0) +
    (commentMentions ?? 0) +
    (coAuthorInvite ?? 0) +
    (coAuthorReview ?? 0) +
    Math.max(coSoStaffInvite ?? 0, coSoStaffMembershipPending ?? 0) +
    (orgMilestoneTag ?? 0) +
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
    const commenterId = row.noi_dung_ai as string | null;
    const objectId = row.id_doi_tuong as string | null;
    if (!commenterId || !objectId) continue;

    if (row.loai_doi_tuong === "binh_luan_tra_loi") {
      const milestoneId = await resolveMilestoneIdForCommentNotify(admin, objectId);
      if (!milestoneId) continue;
      const { data: related } = await admin
        .from("social_thong_bao")
        .select("id")
        .eq("nguoi_nhan", viewerId)
        .eq("loai_doi_tuong", "binh_luan_tra_loi")
        .eq("noi_dung_ai", commenterId)
        .eq("da_doc", false)
        .eq("id_doi_tuong", milestoneId)
        .returns<Array<{ id: string }>>();
      for (const relatedRow of related ?? []) {
        result.add(relatedRow.id);
      }
      continue;
    }

    if (row.loai_doi_tuong === "mention_binh_luan") {
      const milestoneId = await resolveMilestoneIdForCommentNotify(admin, objectId);
      if (!milestoneId) continue;
      const { data: related } = await admin
        .from("social_thong_bao")
        .select("id")
        .eq("nguoi_nhan", viewerId)
        .eq("loai_doi_tuong", "mention_binh_luan")
        .eq("noi_dung_ai", commenterId)
        .eq("da_doc", false)
        .eq("id_doi_tuong", milestoneId)
        .returns<Array<{ id: string }>>();
      for (const relatedRow of related ?? []) {
        result.add(relatedRow.id);
      }
      continue;
    }

    if (row.loai_doi_tuong !== "cot_moc_comment") continue;

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
      "binh_luan_tra_loi",
      "mention_binh_luan",
      "org_milestone_tag_approved",
      "video_ready",
    ]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
