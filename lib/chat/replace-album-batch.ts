import type { ChatMessage } from "@/lib/chat/types";

/** Thay album optimistic bằng tin ảnh thật — giữ vị trí, gỡ trùng id. */
export function replaceOptimisticAlbumWithRealMessages(
  messages: ChatMessage[],
  albumOptimisticId: string,
  realMessages: ChatMessage[],
): ChatMessage[] {
  const realIds = new Set(realMessages.map((m) => m.id));
  const optIdx = messages.findIndex((m) => m.id === albumOptimisticId);

  const cleaned = messages.filter(
    (m) => m.id !== albumOptimisticId && !realIds.has(m.id),
  );

  if (optIdx < 0) {
    return [...cleaned, ...realMessages];
  }

  let insertAt = 0;
  for (let i = 0; i < optIdx; i += 1) {
    const message = messages[i]!;
    if (message.id !== albumOptimisticId && !realIds.has(message.id)) {
      insertAt += 1;
    }
  }

  return [
    ...cleaned.slice(0, insertAt),
    ...realMessages,
    ...cleaned.slice(insertAt),
  ];
}
