import type { ChatMessageListItem } from "@/lib/chat/message-albums";
import type { ChatMessage } from "@/lib/chat/types";

/** Tin cùng người gửi cách nhau dưới khoảng này không hiện timestamp / tên+avatar. */
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

function clusterBreaks(prev: ChatMessage, next: ChatMessage): boolean {
  if (!sameChatSender(prev, next)) return true;
  const gap = Date.parse(next.sentAt) - Date.parse(prev.sentAt);
  if (Number.isNaN(gap)) return true;
  return gap >= CHAT_BUBBLE_TIME_CLUSTER_MS;
}

/** Đầu cụm mới: tin đầu, đổi người gửi, hoặc ≥ 5 phút. */
export function isChatClusterHead(
  items: ChatMessageListItem[],
  index: number,
): boolean {
  const curr = items[index];
  const prev = items[index - 1];
  if (!curr) return false;
  if (!prev) return true;
  return clusterBreaks(listItemTail(prev), listItemHead(curr));
}

/** Cuối cụm: tin cuối, đổi người gửi kế, hoặc ≥ 5 phút tới tin sau. */
export function isChatClusterTail(
  items: ChatMessageListItem[],
  index: number,
): boolean {
  const curr = items[index];
  const next = items[index + 1];
  if (!curr) return false;
  if (!next) return true;
  return clusterBreaks(listItemTail(curr), listItemHead(next));
}

export type ChatClusterRole = "only" | "first" | "middle" | "last";

export function chatClusterRole(
  items: ChatMessageListItem[],
  index: number,
): ChatClusterRole {
  const head = isChatClusterHead(items, index);
  const tail = isChatClusterTail(items, index);
  if (head && tail) return "only";
  if (head) return "first";
  if (tail) return "last";
  return "middle";
}

/** Mốc ngày/giờ giữa khung — đầu cụm mới. */
export function shouldShowChatItemTime(
  items: ChatMessageListItem[],
  index: number,
): boolean {
  return isChatClusterHead(items, index);
}

export function chatListItemStampAt(item: ChatMessageListItem): string {
  return listItemHead(item).sentAt;
}
