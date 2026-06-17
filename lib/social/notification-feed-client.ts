import type { NotificationFeed } from "@/lib/social/types";

export const EMPTY_NOTIFICATION_HISTORY_FEED: NotificationFeed = {
  unreadCount: 0,
  followRequests: [],
  accepted: [],
  comments: [],
  coAuthorInvites: [],
  coAuthorReviews: [],
  coSoStaffInvites: [],
  orgMilestoneTagApproved: [],
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
  };
}
