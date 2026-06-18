import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatMessage, ChatMessageKind, ChatMessageReplyPreview } from "@/lib/chat/types";

const OPTIMISTIC_PREFIX = "optimistic-";

export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_PREFIX);
}

export function createOptimisticChatMessage(input: {
  body: string;
  kind?: ChatMessageKind;
  imageId?: string | null;
  imageUrl?: string | null;
  replyTo?: ChatMessageReplyPreview | null;
  sentAt?: string;
}): ChatMessage {
  const kind = input.kind ?? (input.imageId ? "media" : "text");
  const imageId = input.imageId ?? null;
  const imageUrl =
    input.imageUrl ??
    (imageId ? chatImageDeliveryUrl(imageId) : null);

  return {
    id: `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`,
    from: "me",
    body: input.body,
    sentAt: input.sentAt ?? new Date().toISOString(),
    kind,
    imageId,
    imageUrl,
    replyTo: input.replyTo ?? null,
  };
}

/** Một bubble album (1+ ảnh) — không tách từng ảnh trên UI khi gửi. */
export function createOptimisticAlbumMessage(input: {
  images: Array<{ imageId: string; previewUrl: string }>;
  replyTo?: ChatMessageReplyPreview | null;
  sentAt?: string;
}): ChatMessage {
  const sentAt = input.sentAt ?? new Date().toISOString();
  const albumImages = input.images.map((image) => ({
    imageId: image.imageId,
    imageUrl: image.previewUrl,
  }));
  const first = albumImages[0]!;

  return {
    id: `${OPTIMISTIC_PREFIX}album-${crypto.randomUUID()}`,
    from: "me",
    body: "",
    sentAt,
    kind: "media",
    imageId: first.imageId,
    imageUrl: first.imageUrl,
    albumImages,
    replyTo: input.replyTo ?? null,
  };
}

export function isOptimisticAlbumMessage(message: ChatMessage): boolean {
  return (
    isOptimisticMessageId(message.id) &&
    Boolean(message.albumImages?.length)
  );
}

export function messagePreviewText(message: ChatMessage): string {
  if (message.deleted) return "Đã thu hồi tin nhắn";
  if (message.albumImages?.length) {
    return message.albumImages.length > 1
      ? `${message.albumImages.length} ảnh`
      : "Ảnh";
  }
  if (message.kind === "media" || message.imageId) {
    return message.body.trim() || "Ảnh";
  }
  return message.body.trim();
}
