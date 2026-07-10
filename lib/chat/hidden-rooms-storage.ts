/** Ẩn hội thoại khỏi danh sách sidebar (client-side, theo viewer). */
const PREFIX = "cins-chat-hidden-rooms:v1:";

function storageKey(viewerProfileId: string): string {
  return `${PREFIX}${viewerProfileId}`;
}

export function readHiddenRoomIds(viewerProfileId: string | null): string[] {
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

export function writeHiddenRoomIds(viewerProfileId: string, roomIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(viewerProfileId), JSON.stringify(roomIds));
  } catch {
    /* quota / disabled */
  }
}
