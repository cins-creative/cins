/** Panel mở rộng hội thoại (pin / mocs / canvas) — client-side, theo viewer. */

export type StoredChatSidePanel = "pin" | "mocs" | "canvas";

const PREFIX = "cins-chat-side-panel:v1:";
const VALID = new Set<StoredChatSidePanel>([
  "pin",
  "mocs",
  "canvas",
]);

function storageKey(viewerProfileId: string): string {
  return `${PREFIX}${viewerProfileId}`;
}

export function readChatSidePanel(
  viewerProfileId: string | null,
): StoredChatSidePanel | null {
  if (!viewerProfileId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(viewerProfileId));
    if (!raw || raw === "null") return null;
    if (VALID.has(raw as StoredChatSidePanel)) {
      return raw as StoredChatSidePanel;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeChatSidePanel(
  viewerProfileId: string,
  panel: StoredChatSidePanel | null,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(viewerProfileId),
      panel == null ? "null" : panel,
    );
  } catch {
    /* quota / disabled */
  }
}
