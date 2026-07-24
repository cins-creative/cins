import type { ChatMessage, ChatReadCursor } from "@/lib/chat/types";

export const CHAT_MESSAGES_PAGE_SIZE = 30;

export type RoomMessagesPage = {
  messages: ChatMessage[];
  hasMore: boolean;
  pinnedMessages?: ChatMessage[];
  readCursors?: ChatReadCursor[];
  /** @deprecated */
  peerReadUpToId?: string | null;
};

export async function fetchRoomMessagesPage(
  roomId: string,
  options?: { before?: string; limit?: number; markRead?: boolean },
): Promise<RoomMessagesPage | null> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? CHAT_MESSAGES_PAGE_SIZE));
  if (options?.before) {
    params.set("before", options.before);
  }
  if (options?.markRead) {
    params.set("mark_read", "1");
  }

  try {
    const res = await fetch(
      `/api/chat/rooms/${roomId}/messages?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as RoomMessagesPage;
    return {
      messages: json.messages ?? [],
      hasMore: Boolean(json.hasMore),
      pinnedMessages: json.pinnedMessages,
      readCursors: json.readCursors ?? [],
      peerReadUpToId: json.peerReadUpToId,
    };
  } catch {
    return null;
  }
}
