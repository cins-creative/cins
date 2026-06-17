import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";

const PREFIX = "cins-journey-post:v1:";
export const POST_PAGE_CACHE_TTL_MS = 15 * 60 * 1000;

type PanelEntry<T> = {
  savedAt: number;
  data: T;
};

function storageKey(ownerSlug: string, postSlug: string): string {
  return `${PREFIX}${ownerSlug.trim()}:${postSlug.trim()}`;
}

function isFresh(entry: PanelEntry<unknown> | undefined): boolean {
  if (!entry?.savedAt) return false;
  return Date.now() - entry.savedAt < POST_PAGE_CACHE_TTL_MS;
}

/** Stable snapshot refs for useSyncExternalStore (raw string equality). */
const snapshotByKey = new Map<
  string,
  { raw: string | null; savedAt: number | null; value: MilestonePostDetail | null }
>();

export function readPostPageCache(
  ownerSlug: string,
  postSlug: string,
): MilestonePostDetail | null {
  if (typeof window === "undefined") return null;
  const key = storageKey(ownerSlug, postSlug);
  try {
    const raw = localStorage.getItem(key);
    const cached = snapshotByKey.get(key);
    if (cached && cached.raw === raw) {
      if (!cached.value) return null;
      if (
        cached.savedAt &&
        Date.now() - cached.savedAt < POST_PAGE_CACHE_TTL_MS
      ) {
        return cached.value;
      }
      snapshotByKey.set(key, { raw, savedAt: cached.savedAt, value: null });
      return null;
    }

    let value: MilestonePostDetail | null = null;
    let savedAt: number | null = null;
    if (raw) {
      const parsed = JSON.parse(raw) as PanelEntry<MilestonePostDetail>;
      savedAt = parsed?.savedAt ?? null;
      if (parsed?.data && isFresh(parsed)) {
        value = parsed.data;
      }
    }
    snapshotByKey.set(key, { raw, savedAt, value });
    return value;
  } catch {
    snapshotByKey.set(key, { raw: null, savedAt: null, value: null });
    return null;
  }
}

export function writePostPageCache(
  ownerSlug: string,
  postSlug: string,
  detail: MilestonePostDetail,
): void {
  if (typeof window === "undefined") return;
  const key = storageKey(ownerSlug, postSlug);
  try {
    const payload: PanelEntry<MilestonePostDetail> = {
      savedAt: Date.now(),
      data: detail,
    };
    const raw = JSON.stringify(payload);
    localStorage.setItem(key, raw);
    snapshotByKey.set(key, { raw, savedAt: payload.savedAt, value: detail });
  } catch {
    /* quota / disabled */
  }
}

export function isPostPageCacheStale(
  ownerSlug: string,
  postSlug: string,
): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(storageKey(ownerSlug, postSlug));
    if (!raw) return true;
    const parsed = JSON.parse(raw) as PanelEntry<MilestonePostDetail>;
    return !isFresh(parsed);
  } catch {
    return true;
  }
}

/** Xoá cache trang/modal bài viết sau compose publish hoặc edit. */
export function invalidatePostPageCache(
  ownerSlug: string,
  postSlug: string,
): void {
  if (typeof window === "undefined") return;
  const key = storageKey(ownerSlug, postSlug);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  snapshotByKey.set(key, { raw: null, savedAt: null, value: null });
}
