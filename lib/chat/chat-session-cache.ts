import type { ChatMessage, ChatThread } from "@/lib/chat/types";

const THREADS_PREFIX = "cins-chat-threads:v1:";
const MESSAGES_PREFIX = "cins-chat-messages:v1:";
/** Cache phiên — đủ nhanh khi mở FAB/mini, không thay server truth lâu dài. */
export const CHAT_SESSION_CACHE_TTL_MS = 10 * 60 * 1000;
/**
 * Trần tin mỗi phòng trong sessionStorage — chặn JSON.stringify phình + quota ~5MB.
 * State React (overlay/mini) không bị cắt; chỉ bản cache mở nguội.
 */
export const CHAT_SESSION_MESSAGES_CAP = 200;

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
  const capped =
    messages.length > CHAT_SESSION_MESSAGES_CAP
      ? messages.slice(-CHAT_SESSION_MESSAGES_CAP)
      : messages;
  writeEntry(messagesKey(viewerProfileId, roomId), capped);
}

/** Ghi unread một phòng vào cache phiên — tránh reload hiện lại badge đỏ. */
export function patchChatThreadUnreadInCache(
  viewerProfileId: string | null,
  roomId: string,
  unread: number,
): void {
  if (!viewerProfileId) return;
  const snap = readChatThreadsCache(viewerProfileId);
  if (!snap) return;
  let changed = false;
  const threads = snap.threads.map((t) => {
    if (t.roomId !== roomId) return t;
    const nextUnread = Math.max(0, unread);
    const nextMentions =
      nextUnread === 0 ? 0 : (t.unreadMentions ?? 0);
    if (t.unread === nextUnread && (t.unreadMentions ?? 0) === nextMentions) {
      return t;
    }
    changed = true;
    return { ...t, unread: nextUnread, unreadMentions: nextMentions };
  });
  if (!changed) return;
  writeChatThreadsCache(viewerProfileId, {
    threads,
    totalUnread: threads.reduce((sum, t) => sum + t.unread, 0),
  });
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
