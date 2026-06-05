import type { MilestonePostDetail } from "@/app/[slug]/journey/actions";

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

export function readPostPageCache(
  ownerSlug: string,
  postSlug: string,
): MilestonePostDetail | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(ownerSlug, postSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelEntry<MilestonePostDetail>;
    if (!parsed?.data || !isFresh(parsed)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writePostPageCache(
  ownerSlug: string,
  postSlug: string,
  detail: MilestonePostDetail,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PanelEntry<MilestonePostDetail> = {
      savedAt: Date.now(),
      data: detail,
    };
    localStorage.setItem(storageKey(ownerSlug, postSlug), JSON.stringify(payload));
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
