/** Tắt thông báo theo phòng (client-side, theo viewer). */
const PREFIX = "cins-chat-muted-rooms:v1:";

function storageKey(viewerProfileId: string): string {
  return `${PREFIX}${viewerProfileId}`;
}

export function readMutedRoomIds(viewerProfileId: string | null): string[] {
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

export function writeMutedRoomIds(viewerProfileId: string, roomIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(viewerProfileId), JSON.stringify(roomIds));
  } catch {
    /* quota / disabled */
  }
}
