import { CHAT_ACTION_WINDOW_MS } from "@/lib/chat/constants";
import { isOptimisticMessageId } from "@/lib/chat/optimistic-message";
import type { ChatMessage } from "@/lib/chat/types";

/** Sửa nội dung — chỉ tin của mình trong cửa sổ thời gian. */
export function canEditMessage(msg: ChatMessage): boolean {
  if (msg.from !== "me" || msg.deleted) return false;
  if (isOptimisticMessageId(msg.id)) return false;
  return Date.now() - new Date(msg.sentAt).getTime() <= CHAT_ACTION_WINDOW_MS;
}

/** Thu hồi — mọi tin của mình đã lưu server (soft-delete `da_xoa`). */
export function canRecallMessage(msg: ChatMessage): boolean {
  return msg.from === "me" && !msg.deleted && !isOptimisticMessageId(msg.id);
}
