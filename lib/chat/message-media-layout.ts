import type { ChatMessage } from "@/lib/chat/types";

export type ChatMessageMediaLayout =
  | "text"
  | "media-only"
  | "media-caption"
  | "sticker"
  | "context";

export function chatMessageMediaLayout(msg: ChatMessage): ChatMessageMediaLayout {
  if (msg.nguCanh) return "context";
  if (msg.kind === "sticker") return "sticker";
  const hasMedia = Boolean(msg.imageId || msg.imageUrl);
  if (!hasMedia) return "text";
  const caption = msg.body.trim();
  return caption ? "media-caption" : "media-only";
}

export function chatMessageHasInteractiveMedia(msg: ChatMessage): boolean {
  const layout = chatMessageMediaLayout(msg);
  return layout === "media-only" || layout === "media-caption" || layout === "sticker";
}
