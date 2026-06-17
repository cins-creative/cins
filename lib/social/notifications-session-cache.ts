import type { NotificationFeed } from "@/lib/social/types";

const PREFIX = "cins-notifications:v1:";
/** Cùng TTL với chat — đủ cho mở bell ngay lập tức. */
export const NOTIFICATIONS_SESSION_CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = {
  savedAt: number;
  data: T;
};

export type NotificationCacheFilter = "unread" | "history";

function isFresh(entry: CacheEntry<unknown> | null | undefined): boolean {
  if (!entry?.savedAt) return false;
  return Date.now() - entry.savedAt < NOTIFICATIONS_SESSION_CACHE_TTL_MS;
}

function cacheKey(viewerProfileId: string, filter: NotificationCacheFilter): string {
  return `${PREFIX}${viewerProfileId}:${filter}`;
}

function readFeed(
  viewerProfileId: string | null,
  filter: NotificationCacheFilter,
): NotificationFeed | null {
  if (!viewerProfileId) return null;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(viewerProfileId, filter));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<NotificationFeed>;
    if (!parsed || typeof parsed !== "object" || !isFresh(parsed)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeFeed(
  viewerProfileId: string,
  filter: NotificationCacheFilter,
  feed: NotificationFeed,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      cacheKey(viewerProfileId, filter),
      JSON.stringify({ savedAt: Date.now(), data: feed } satisfies CacheEntry<NotificationFeed>),
    );
  } catch {
    /* quota / disabled */
  }
}

export function readUnreadNotificationsCache(
  viewerProfileId: string | null,
): NotificationFeed | null {
  return readFeed(viewerProfileId, "unread");
}

export function writeUnreadNotificationsCache(
  viewerProfileId: string,
  feed: NotificationFeed,
): void {
  writeFeed(viewerProfileId, "unread", feed);
}

export function readHistoryNotificationsCache(
  viewerProfileId: string | null,
): NotificationFeed | null {
  return readFeed(viewerProfileId, "history");
}

export function writeHistoryNotificationsCache(
  viewerProfileId: string,
  feed: NotificationFeed,
): void {
  writeFeed(viewerProfileId, "history", feed);
}

export function invalidateNotificationsCache(viewerProfileId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(cacheKey(viewerProfileId, "unread"));
    sessionStorage.removeItem(cacheKey(viewerProfileId, "history"));
  } catch {
    /* ignore */
  }
}
