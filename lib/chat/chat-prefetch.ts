import {
  readChatThreadsCache,
  readRoomMessagesCache,
  writeChatThreadsCache,
  writeRoomMessagesCache,
  type ChatThreadsSnapshot,
} from "@/lib/chat/chat-session-cache";
import { isPendingRoomId } from "@/lib/chat/optimistic-thread";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";
import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import { registerClientCacheClear } from "@/lib/client-cache";

const UNREAD_ROOM_PREFETCH_LIMIT = 5;
/** RAM TTL — hai poller 120s + focus/visibility dùng chung một fetch. */
const THREADS_RAM_TTL_MS = 45_000;

type RamThreadsEntry = { at: number; data: ChatThreadsSnapshot };
const threadsRamByViewer = new Map<string, RamThreadsEntry>();
const threadsInflight = new Map<string, Promise<ChatThreadsSnapshot | null>>();
/** Đã fan-out prefetch tin nhắn phòng chưa đọc trong phiên (tránh mỗi chu kỳ ×5). */
const roomPrefetchDone = new Set<string>();

export async function fetchChatThreadsSnapshot(): Promise<ChatThreadsSnapshot | null> {
  try {
    const res = await fetch("/api/chat/threads", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      threads?: ChatThread[];
      totalUnread?: number;
    };
    return {
      threads: json.threads ?? [],
      totalUnread: json.totalUnread ?? 0,
    };
  } catch {
    return null;
  }
}

function readThreadsRam(
  viewerProfileId: string,
  maxAgeMs = THREADS_RAM_TTL_MS,
): ChatThreadsSnapshot | null {
  const hit = threadsRamByViewer.get(viewerProfileId);
  if (!hit) return null;
  const age = Date.now() - hit.at;
  if (age > THREADS_RAM_TTL_MS) {
    threadsRamByViewer.delete(viewerProfileId);
    return null;
  }
  /* Còn trong TTL chung nhưng cũ hơn mức caller chấp nhận → để caller fetch lại. */
  if (age > maxAgeMs) return null;
  return hit.data;
}

/**
 * Prefetch danh sách thread — TTL RAM + inflight dedup.
 * Fan-out tin nhắn phòng chưa đọc chỉ chạy **một lần / viewer / phiên**,
 * không lặp mỗi chu kỳ poll 120s.
 */
export async function prefetchChatThreads(
  viewerProfileId: string,
  opts?: { force?: boolean; maxAgeMs?: number },
): Promise<ChatThreadsSnapshot | null> {
  if (!opts?.force) {
    const ram = readThreadsRam(viewerProfileId, opts?.maxAgeMs);
    if (ram) return ram;
    /**
     * Vẫn dedupe theo inflight kể cả khi `maxAgeMs` ngắn — nhiều poller + event
     * `visibilitychange`/`focus` bắn cùng lúc chỉ tạo **một** request.
     * `/api/chat/threads` là endpoint đắt nhất của chat (6 nhóm query), nên
     * **không** dùng `force` cho đường tab quay lại.
     */
    const pending = threadsInflight.get(viewerProfileId);
    if (pending) return pending;
  }

  const run = (async (): Promise<ChatThreadsSnapshot | null> => {
    const snapshot = await fetchChatThreadsSnapshot();
    if (!snapshot) {
      const fromSession = readChatThreadsCache(viewerProfileId);
      if (fromSession) {
        threadsRamByViewer.set(viewerProfileId, {
          at: Date.now(),
          data: fromSession,
        });
      }
      return fromSession;
    }

    writeChatThreadsCache(viewerProfileId, snapshot);
    threadsRamByViewer.set(viewerProfileId, {
      at: Date.now(),
      data: snapshot,
    });

    if (!roomPrefetchDone.has(viewerProfileId)) {
      roomPrefetchDone.add(viewerProfileId);
      const unreadRooms = snapshot.threads
        .filter((thread) => thread.unread > 0)
        .slice(0, UNREAD_ROOM_PREFETCH_LIMIT);
      void Promise.all(
        unreadRooms.map((thread) =>
          prefetchRoomMessages(viewerProfileId, thread.roomId),
        ),
      );
    }

    return snapshot;
  })();

  threadsInflight.set(viewerProfileId, run);
  try {
    return await run;
  } finally {
    if (threadsInflight.get(viewerProfileId) === run) {
      threadsInflight.delete(viewerProfileId);
    }
  }
}

/** Xoá RAM/inflight khi logout — sessionStorage vẫn bị clear khi đóng tab. */
export function invalidateChatThreadsPrefetch(viewerProfileId?: string | null) {
  if (viewerProfileId) {
    threadsRamByViewer.delete(viewerProfileId);
    threadsInflight.delete(viewerProfileId);
    roomPrefetchDone.delete(viewerProfileId);
    return;
  }
  threadsRamByViewer.clear();
  threadsInflight.clear();
  roomPrefetchDone.clear();
}

export async function prefetchRoomMessages(
  viewerProfileId: string,
  roomId: string,
): Promise<ChatMessage[] | null> {
  if (isPendingRoomId(roomId)) return [];

  const page = await fetchRoomMessagesPage(roomId);
  if (page) {
    writeRoomMessagesCache(viewerProfileId, roomId, page.messages);
    return page.messages;
  }
  return readRoomMessagesCache(viewerProfileId, roomId);
}

registerClientCacheClear(
  () => invalidateChatThreadsPrefetch(),
  "chat-prefetch",
);
