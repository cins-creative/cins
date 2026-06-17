import type { ChatMessage } from "@/lib/chat/types";

export const CHAT_MESSAGES_PAGE_SIZE = 30;

export type RoomMessagesPage = {
  messages: ChatMessage[];
  hasMore: boolean;
};

export async function fetchRoomMessagesPage(
  roomId: string,
  options?: { before?: string; limit?: number },
): Promise<RoomMessagesPage | null> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? CHAT_MESSAGES_PAGE_SIZE));
  if (options?.before) {
    params.set("before", options.before);
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
    };
  } catch {
    return null;
  }
}
