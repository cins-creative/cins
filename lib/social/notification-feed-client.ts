import type {
  CommentNotification,
  FollowAcceptedNotification,
  FollowHandledNotification,
  MembershipMilestoneResolvedNotification,
  NotificationFeed,
  OrgMilestoneTagApprovedNotification,
  ProcessedCoAuthorReview,
  VideoReadyNotification,
} from "@/lib/social/types";

export type HistoryTimelineEntry =
  | { kind: "handledFollow"; item: FollowHandledNotification }
  | { kind: "processedCoAuthorReview"; item: ProcessedCoAuthorReview }
  | { kind: "accepted"; item: FollowAcceptedNotification }
  | { kind: "comment"; item: CommentNotification }
  | { kind: "membershipMilestoneResolved"; item: MembershipMilestoneResolvedNotification }
  | { kind: "orgMilestoneTagApproved"; item: OrgMilestoneTagApprovedNotification }
  | { kind: "videoReady"; item: VideoReadyNotification };

export const NOTIFICATION_LIST_PAGE_SIZE = 10;

export function historyTimelineToFeed(
  entries: HistoryTimelineEntry[],
): Pick<
  NotificationFeed,
  | "handledFollows"
  | "processedCoAuthorReviews"
  | "accepted"
  | "comments"
  | "membershipMilestoneResolved"
  | "orgMilestoneTagApproved"
  | "videoReady"
> {
  const feed = {
    handledFollows: [] as FollowHandledNotification[],
    processedCoAuthorReviews: [] as ProcessedCoAuthorReview[],
    accepted: [] as FollowAcceptedNotification[],
    comments: [] as CommentNotification[],
    membershipMilestoneResolved: [] as MembershipMilestoneResolvedNotification[],
    orgMilestoneTagApproved: [] as OrgMilestoneTagApprovedNotification[],
    videoReady: [] as VideoReadyNotification[],
  };

  for (const entry of entries) {
    switch (entry.kind) {
      case "handledFollow":
        feed.handledFollows.push(entry.item);
        break;
      case "processedCoAuthorReview":
        feed.processedCoAuthorReviews.push(entry.item);
        break;
      case "accepted":
        feed.accepted.push(entry.item);
        break;
      case "comment":
        feed.comments.push(entry.item);
        break;
      case "membershipMilestoneResolved":
        feed.membershipMilestoneResolved.push(entry.item);
        break;
      case "orgMilestoneTagApproved":
        feed.orgMilestoneTagApproved.push(entry.item);
        break;
      case "videoReady":
        feed.videoReady.push(entry.item);
        break;
    }
  }

  return feed;
}

export function appendHistoryTimeline(
  prev: HistoryTimelineEntry[],
  next: HistoryTimelineEntry[],
): HistoryTimelineEntry[] {
  if (next.length === 0) return prev;
  const seen = new Set(prev.map((entry) => entry.item.notificationId));
  const merged = [...prev];
  for (const entry of next) {
    if (seen.has(entry.item.notificationId)) continue;
    seen.add(entry.item.notificationId);
    merged.push(entry);
  }
  return merged;
}

export type InfoTimelineEntry =
  | { kind: "membershipMilestoneResolved"; item: MembershipMilestoneResolvedNotification }
  | { kind: "orgMilestoneTagApproved"; item: OrgMilestoneTagApprovedNotification }
  | { kind: "accepted"; item: FollowAcceptedNotification }
  | { kind: "comment"; item: CommentNotification }
  | { kind: "videoReady"; item: VideoReadyNotification };

function notificationSortTime(iso?: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function sortTimelineEntries<T extends { sortTime: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.sortTime - a.sortTime);
}

export function buildHistoryTimeline(
  feed: Pick<
    NotificationFeed,
    | "handledFollows"
    | "processedCoAuthorReviews"
    | "accepted"
    | "comments"
    | "membershipMilestoneResolved"
    | "orgMilestoneTagApproved"
    | "videoReady"
  >,
): HistoryTimelineEntry[] {
  const entries: Array<HistoryTimelineEntry & { sortTime: number }> = [];

  for (const item of feed.handledFollows) {
    entries.push({
      kind: "handledFollow",
      item,
      sortTime: notificationSortTime(item.xuLyLuc),
    });
  }
  for (const item of feed.processedCoAuthorReviews) {
    entries.push({
      kind: "processedCoAuthorReview",
      item,
      sortTime: notificationSortTime(item.xuLyLuc),
    });
  }
  for (const item of feed.accepted) {
    entries.push({
      kind: "accepted",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of feed.comments) {
    entries.push({
      kind: "comment",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of feed.membershipMilestoneResolved) {
    entries.push({
      kind: "membershipMilestoneResolved",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of feed.orgMilestoneTagApproved) {
    entries.push({
      kind: "orgMilestoneTagApproved",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of feed.videoReady) {
    entries.push({
      kind: "videoReady",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }

  return sortTimelineEntries(entries).map(({ sortTime: _sortTime, ...entry }) => entry);
}

export function buildInfoTimeline(info: {
  accepted: FollowAcceptedNotification[];
  comments: CommentNotification[];
  videoReady: VideoReadyNotification[];
  orgMilestoneTagApproved: OrgMilestoneTagApprovedNotification[];
  membershipMilestoneResolved: MembershipMilestoneResolvedNotification[];
}): InfoTimelineEntry[] {
  const entries: Array<InfoTimelineEntry & { sortTime: number }> = [];

  for (const item of info.accepted) {
    entries.push({
      kind: "accepted",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of info.comments) {
    entries.push({
      kind: "comment",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of info.videoReady) {
    entries.push({
      kind: "videoReady",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of info.orgMilestoneTagApproved) {
    entries.push({
      kind: "orgMilestoneTagApproved",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }
  for (const item of info.membershipMilestoneResolved) {
    entries.push({
      kind: "membershipMilestoneResolved",
      item,
      sortTime: notificationSortTime(item.taoLuc),
    });
  }

  return sortTimelineEntries(entries).map(({ sortTime: _sortTime, ...entry }) => entry);
}

export const EMPTY_NOTIFICATION_HISTORY_FEED: NotificationFeed = {
  unreadCount: 0,
  followRequests: [],
  accepted: [],
  comments: [],
  coAuthorInvites: [],
  coAuthorReviews: [],
  coSoStaffInvites: [],
  orgMilestoneTagApproved: [],
  membershipMilestoneResolved: [],
  videoReady: [],
  handledFollows: [],
  processedCoAuthorReviews: [],
};

export function parseNotificationFeedPayload(
  json: unknown,
): NotificationFeed | null {
  if (!json || typeof json !== "object") return null;
  const data = json as NotificationFeed;
  if (!Array.isArray(data.followRequests)) return null;
  return {
    ...EMPTY_NOTIFICATION_HISTORY_FEED,
    ...data,
    coAuthorInvites: Array.isArray(data.coAuthorInvites)
      ? data.coAuthorInvites
      : [],
    coAuthorReviews: Array.isArray(data.coAuthorReviews)
      ? data.coAuthorReviews
      : [],
    coSoStaffInvites: Array.isArray(data.coSoStaffInvites)
      ? data.coSoStaffInvites
      : [],
    orgMilestoneTagApproved: Array.isArray(data.orgMilestoneTagApproved)
      ? data.orgMilestoneTagApproved
      : [],
    membershipMilestoneResolved: Array.isArray(data.membershipMilestoneResolved)
      ? data.membershipMilestoneResolved
      : [],
  };
}

export function parseNotificationFeedPage(json: unknown): {
  feed: NotificationFeed;
  hasMore: boolean;
  nextOffset: number;
} | null {
  const feed = parseNotificationFeedPayload(json);
  if (!feed) return null;
  const data = json as { hasMore?: unknown; nextOffset?: unknown };
  const hasMore = data.hasMore === true;
  const nextOffset =
    typeof data.nextOffset === "number" && Number.isFinite(data.nextOffset)
      ? data.nextOffset
      : feed.handledFollows.length +
        feed.processedCoAuthorReviews.length +
        feed.accepted.length +
        feed.comments.length +
        feed.membershipMilestoneResolved.length +
        feed.orgMilestoneTagApproved.length +
        feed.videoReady.length;
  return { feed, hasMore, nextOffset };
}
