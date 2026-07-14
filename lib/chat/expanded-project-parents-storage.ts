/** Trạng thái xổ project con dưới nhóm gốc (client-side, theo viewer). */
const PREFIX = "cins-chat-expanded-project-parents:v1:";

function storageKey(viewerProfileId: string): string {
  return `${PREFIX}${viewerProfileId}`;
}

export function readExpandedProjectParentIds(
  viewerProfileId: string | null,
): string[] {
  if (!viewerProfileId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(viewerProfileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  } catch {
    return [];
  }
}

export function writeExpandedProjectParentIds(
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

export function expandedParentsRecordFromIds(
  roomIds: string[],
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const id of roomIds) next[id] = true;
  return next;
}

export function expandedParentIdsFromRecord(
  map: Record<string, boolean>,
): string[] {
  return Object.entries(map)
    .filter(([, open]) => open)
    .map(([id]) => id);
}
