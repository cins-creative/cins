import type { ChatMessageListItem } from "@/lib/chat/message-albums";
import type { ChatMessage } from "@/lib/chat/types";

/** Tin cùng người gửi cách nhau dưới khoảng này không hiện timestamp. */
export const CHAT_BUBBLE_TIME_CLUSTER_MS = 5 * 60 * 1000;

function listItemHead(item: ChatMessageListItem): ChatMessage {
  return item.type === "single" ? item.message : item.messages[0]!;
}

function listItemTail(item: ChatMessageListItem): ChatMessage {
  if (item.type === "single") return item.message;
  return item.messages[item.messages.length - 1]!;
}

function sameChatSender(a: ChatMessage, b: ChatMessage): boolean {
  if (a.from !== b.from) return false;
  const idA = a.senderUserId?.trim();
  const idB = b.senderUserId?.trim();
  if (idA && idB) return idA === idB;
  return true;
}

/** Hiện giờ dưới bubble cuối cụm; ẩn nếu tin kế cùng người gửi < 5 phút. */
export function shouldShowChatItemTime(
  items: ChatMessageListItem[],
  index: number,
): boolean {
  const curr = items[index];
  const next = items[index + 1];
  if (!curr) return false;
  if (!next) return true;
  const a = listItemTail(curr);
  const b = listItemHead(next);
  if (!sameChatSender(a, b)) return true;
  const gap = Date.parse(b.sentAt) - Date.parse(a.sentAt);
  if (Number.isNaN(gap)) return true;
  return gap >= CHAT_BUBBLE_TIME_CLUSTER_MS;
}
