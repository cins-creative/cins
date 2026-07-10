/** Ghim hội thoại lên đầu danh sách sidebar (khác ghim bubble). */
const PREFIX = "cins-chat-pinned-list:v1:";

function storageKey(viewerProfileId: string): string {
  return `${PREFIX}${viewerProfileId}`;
}

export function readPinnedListRoomIds(viewerProfileId: string | null): string[] {
  if (!viewerProfileId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(viewerProfileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function writePinnedListRoomIds(
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
