import {
  readChatThreadsCache,
  readRoomMessagesCache,
  writeChatThreadsCache,
  writeRoomMessagesCache,
  type ChatThreadsSnapshot,
} from "@/lib/chat/chat-session-cache";
import { isPendingRoomId } from "@/lib/chat/optimistic-thread";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";

const UNREAD_ROOM_PREFETCH_LIMIT = 5;

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

import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";

export async function prefetchChatThreads(
  viewerProfileId: string,
): Promise<ChatThreadsSnapshot | null> {
  const snapshot = await fetchChatThreadsSnapshot();
  if (!snapshot) return readChatThreadsCache(viewerProfileId);

  writeChatThreadsCache(viewerProfileId, snapshot);

  const unreadRooms = snapshot.threads
    .filter((thread) => thread.unread > 0)
    .slice(0, UNREAD_ROOM_PREFETCH_LIMIT);

  void Promise.all(
    unreadRooms.map((thread) => prefetchRoomMessages(viewerProfileId, thread.roomId)),
  );

  return snapshot;
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
