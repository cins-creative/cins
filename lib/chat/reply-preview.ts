import type { ChatMessageReplyPreview } from "@/lib/chat/types";

export function replyPreviewLabel(reply: ChatMessageReplyPreview): string {
  if (reply.deleted) return "Tin nhắn đã được thu hồi";
  if (reply.kind === "media" || reply.imageUrl) {
    return reply.body.trim() || "Ảnh";
  }
  return reply.body.trim() || "Tin nhắn";
}
