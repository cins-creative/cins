import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatMessage, ChatMessageKind } from "@/lib/chat/types";

const OPTIMISTIC_PREFIX = "optimistic-";

export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_PREFIX);
}

export function createOptimisticChatMessage(input: {
  body: string;
  kind?: ChatMessageKind;
  imageId?: string | null;
  imageUrl?: string | null;
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
    sentAt: new Date().toISOString(),
    kind,
    imageId,
    imageUrl,
  };
}

export function messagePreviewText(message: ChatMessage): string {
  if (message.kind === "media" || message.imageId) {
    return message.body.trim() || "Ảnh";
  }
  return message.body.trim();
}
