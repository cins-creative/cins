import type { ChatMessage, ChatThread } from "@/lib/chat/types";

export function updateMessageInList(
  messages: ChatMessage[],
  messageId: string,
  patch: Partial<ChatMessage>,
): ChatMessage[] {
  return messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m));
}

export function patchThreadMessages(
  threads: ChatThread[],
  threadId: string,
  updater: (messages: ChatMessage[]) => ChatMessage[],
): ChatThread[] {
  return threads.map((t) =>
    t.id === threadId ? { ...t, messages: updater(t.messages) } : t,
  );
}

export function patchThreadByRoomId(
  threads: ChatThread[],
  roomId: string,
  updater: (thread: ChatThread) => ChatThread,
): ChatThread[] {
  return threads.map((t) => (t.roomId === roomId ? updater(t) : t));
}
