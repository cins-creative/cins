/**
 * First-impression pin (client) — bài mới ghim top lần đầu trong tab;
 * sessionStorage sống qua F5 nên reload không ghim lại.
 */

import { WORLD_JOURNEY_FIRST_IMPRESSION_CAP } from "@/lib/cins/worldJourneyFeedConstants";

const STORAGE_PREFIX = "cins:wj-first-impression:";

export function worldJourneyFirstImpressionStorageKey(
  viewerId: string,
): string {
  return `${STORAGE_PREFIX}${viewerId}`;
}

export function worldJourneyMilestonePinKey(m: {
  cotMocId?: string | null;
  id: string;
}): string {
  return m.cotMocId ?? m.id;
}

export function readWorldJourneyFirstImpressionSeen(
  viewerId: string,
): Set<string> {
  if (typeof sessionStorage === "undefined" || !viewerId) {
    return new Set();
  }
  try {
    const raw = sessionStorage.getItem(
      worldJourneyFirstImpressionStorageKey(viewerId),
    );
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is string => typeof id === "string" && id.length > 0),
    );
  } catch {
    return new Set();
  }
}

export function writeWorldJourneyFirstImpressionSeen(
  viewerId: string,
  seen: ReadonlySet<string>,
): void {
  if (typeof sessionStorage === "undefined" || !viewerId) return;
  try {
    sessionStorage.setItem(
      worldJourneyFirstImpressionStorageKey(viewerId),
      JSON.stringify([...seen]),
    );
  } catch {
    /* quota / private mode */
  }
}

/** Đánh dấu các id vừa được ghim first-impression (merge vào set hiện có). */
export function markWorldJourneyFirstImpressionSeen(
  viewerId: string,
  newlyPinnedIds: ReadonlyArray<string>,
): void {
  if (!viewerId || newlyPinnedIds.length === 0) return;
  const seen = readWorldJourneyFirstImpressionSeen(viewerId);
  for (const id of newlyPinnedIds) {
    if (id) seen.add(id);
  }
  writeWorldJourneyFirstImpressionSeen(viewerId, seen);
}

/** Xóa mark first-impression của một viewer (logout). */
export function clearWorldJourneyFirstImpressionSeen(
  viewerId: string | null | undefined,
): void {
  if (typeof sessionStorage === "undefined" || !viewerId) return;
  try {
    sessionStorage.removeItem(worldJourneyFirstImpressionStorageKey(viewerId));
  } catch {
    /* ignore */
  }
}

/** Xóa mọi key first-impression trong tab (logout khi không chắc viewerId). */
export function clearAllWorldJourneyFirstImpressionSeen(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export { WORLD_JOURNEY_FIRST_IMPRESSION_CAP };
