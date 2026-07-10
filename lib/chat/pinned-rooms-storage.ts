const PREFIX = "cins-chat-pinned-bubble:v1:";
const LEGACY_PREFIX = "cins-chat-pinned-bubble:";

function storageKey(viewerProfileId: string): string {
  return `${PREFIX}${viewerProfileId}`;
}

export function readPinnedRoomIds(viewerProfileId: string | null): string[] {
  if (!viewerProfileId || typeof window === "undefined") return [];
  try {
    const key = storageKey(viewerProfileId);
    let raw = localStorage.getItem(key);
    if (!raw) {
      raw = localStorage.getItem(`${LEGACY_PREFIX}${viewerProfileId}`);
      if (raw) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(`${LEGACY_PREFIX}${viewerProfileId}`);
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function writePinnedRoomIds(
  viewerProfileId: string,
  roomIds: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(viewerProfileId), JSON.stringify(roomIds));
  } catch {
    /* quota / disabled */
  }
}
