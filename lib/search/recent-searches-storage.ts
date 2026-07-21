/**
 * Lịch sử tìm kiếm gần đây — device-local (localStorage), tối đa 10.
 * Key theo tài khoản ghi nhớ khi có; guest dùng bucket chung.
 * Không đồng bộ server — prefs UI theo CINS_DEV_RULES § cache local.
 */

import { readRememberedAccount } from "@/lib/auth/remembered-account";

export const RECENT_SEARCHES_MAX = 10;

const PREFIX = "cins-recent-searches:v1:";

/** Sự kiện cùng tab khi lịch sử đổi (ghi / xóa). */
export const RECENT_SEARCHES_CHANGE_EVENT = "cins-recent-searches-change";

function storageKey(viewerId?: string | null): string {
  if (viewerId) return `${PREFIX}${viewerId}`;
  const account = readRememberedAccount();
  return `${PREFIX}${account?.id ?? "guest"}`;
}

function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map(normalizeQuery)
      .filter((q) => q.length > 0)
      .slice(0, RECENT_SEARCHES_MAX);
  } catch {
    return [];
  }
}

export function readRecentSearches(viewerId?: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseList(window.localStorage.getItem(storageKey(viewerId)));
  } catch {
    return [];
  }
}

function writeRecentSearches(queries: string[], viewerId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(viewerId),
      JSON.stringify(queries.slice(0, RECENT_SEARCHES_MAX)),
    );
  } catch {
    /* quota / private mode */
  }
  window.dispatchEvent(new Event(RECENT_SEARCHES_CHANGE_EVENT));
}

/** Đưa query lên đầu, dedupe không phân biệt hoa thường, giữ tối đa 10. */
export function pushRecentSearch(
  query: string,
  viewerId?: string | null,
): string[] {
  const q = normalizeQuery(query);
  if (!q) return readRecentSearches(viewerId);

  const lower = q.toLowerCase();
  const next = [
    q,
    ...readRecentSearches(viewerId).filter((item) => item.toLowerCase() !== lower),
  ].slice(0, RECENT_SEARCHES_MAX);

  writeRecentSearches(next, viewerId);
  return next;
}

export function removeRecentSearch(
  query: string,
  viewerId?: string | null,
): string[] {
  const lower = normalizeQuery(query).toLowerCase();
  const next = readRecentSearches(viewerId).filter(
    (item) => item.toLowerCase() !== lower,
  );
  writeRecentSearches(next, viewerId);
  return next;
}

export function clearRecentSearches(viewerId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(viewerId));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(RECENT_SEARCHES_CHANGE_EVENT));
}
