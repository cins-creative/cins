import type { ChatMessage, ChatThread } from "@/lib/chat/types";

/** Giữ `messages` đã hydrate khi refresh danh sách hội thoại từ API/cache. */
export function preserveThreadMessages(
  prev: ChatThread[],
  incoming: ChatThread[],
): ChatThread[] {
  const messagesByRoom = new Map(
    prev
      .filter((thread) => thread.messages.length > 0)
      .map((thread) => [thread.roomId, thread.messages] as const),
  );

  return incoming.map((thread) => {
    const messages = messagesByRoom.get(thread.roomId);
    return messages?.length ? { ...thread, messages } : thread;
  });
}

const EMPTY_THREAD_PREVIEW = "Bắt đầu trò chuyện";

export function threadLikelyHasMessages(thread: ChatThread): boolean {
  const preview = thread.preview.trim();
  if (!preview || preview === EMPTY_THREAD_PREVIEW) return false;
  return true;
}

/** Preview/`lastAt` từ list mới hơn tin đã hydrate → cần fetch lại. */
export function threadMessagesAreStale(
  messages: ChatMessage[],
  thread: Pick<ChatThread, "lastAt" | "preview">,
): boolean {
  if (messages.length === 0) {
    return threadLikelyHasMessages(thread as ChatThread);
  }
  const lastAt = Date.parse(thread.lastAt);
  const lastMsgAt = Date.parse(messages[messages.length - 1]?.sentAt ?? "");
  if (!Number.isFinite(lastAt) || !Number.isFinite(lastMsgAt)) return false;
  return lastAt > lastMsgAt + 750;
}
