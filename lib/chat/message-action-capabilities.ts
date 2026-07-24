import { CHAT_ACTION_WINDOW_MS } from "@/lib/chat/constants";
import { isOptimisticMessageId } from "@/lib/chat/optimistic-message";
import { findFirstHttpUrl } from "@/lib/link/og-preview";
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

/**
 * Thêm lên canvas — ảnh / album / link trong nội dung (không sticky chữ thuần).
 * Khớp tip board: menu ⋯ → «Thêm vào canvas» khi tin có ảnh/link.
 */
export function canAddMessageToCanvas(msg: ChatMessage): boolean {
  if (msg.deleted || isOptimisticMessageId(msg.id)) return false;
  if (
    msg.kind === "sticker" ||
    msg.kind === "moc_nhac" ||
    msg.kind === "canvas_binh_luan" ||
    msg.kind === "binh_chon"
  ) {
    return false;
  }
  if (msg.imageId || msg.imageUrl) return true;
  if (msg.albumImages?.some((img) => img.imageId || img.imageUrl)) return true;
  return Boolean(findFirstHttpUrl(msg.body));
}
