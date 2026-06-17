import type { ChatMessage, ChatThread } from "@/lib/chat/types";

const THREADS_PREFIX = "cins-chat-threads:v1:";
const MESSAGES_PREFIX = "cins-chat-messages:v1:";
/** Cache phiên — đủ nhanh khi mở FAB/mini, không thay server truth lâu dài. */
export const CHAT_SESSION_CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = {
  savedAt: number;
  data: T;
};

export type ChatThreadsSnapshot = {
  threads: ChatThread[];
  totalUnread: number;
};

function isFresh(entry: CacheEntry<unknown> | null | undefined): boolean {
  if (!entry?.savedAt) return false;
  return Date.now() - entry.savedAt < CHAT_SESSION_CACHE_TTL_MS;
}

function readEntry<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed !== "object" || !isFresh(parsed)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), data } satisfies CacheEntry<T>),
    );
  } catch {
    /* quota / disabled */
  }
}

function threadsKey(viewerProfileId: string): string {
  return `${THREADS_PREFIX}${viewerProfileId}`;
}

function messagesKey(viewerProfileId: string, roomId: string): string {
  return `${MESSAGES_PREFIX}${viewerProfileId}:${roomId}`;
}

export function readChatThreadsCache(
  viewerProfileId: string | null,
): ChatThreadsSnapshot | null {
  if (!viewerProfileId) return null;
  return readEntry<ChatThreadsSnapshot>(threadsKey(viewerProfileId));
}

export function writeChatThreadsCache(
  viewerProfileId: string,
  snapshot: ChatThreadsSnapshot,
): void {
  writeEntry(threadsKey(viewerProfileId), snapshot);
}

export function readRoomMessagesCache(
  viewerProfileId: string | null,
  roomId: string,
): ChatMessage[] | null {
  if (!viewerProfileId || !roomId) return null;
  return readEntry<ChatMessage[]>(messagesKey(viewerProfileId, roomId));
}

export function writeRoomMessagesCache(
  viewerProfileId: string,
  roomId: string,
  messages: ChatMessage[],
): void {
  writeEntry(messagesKey(viewerProfileId, roomId), messages);
}

export function invalidateRoomMessagesCache(
  viewerProfileId: string,
  roomId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(messagesKey(viewerProfileId, roomId));
  } catch {
    /* ignore */
  }
}
