import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatMessage } from "@/lib/chat/types";

const ALBUM_MAX_GAP_MS = 2 * 60 * 1000;

export type ChatMessageListItem =
  | { type: "single"; message: ChatMessage }
  | {
      type: "album";
      messages: ChatMessage[];
      sentAt: string;
      from: ChatMessage["from"];
    };

export function chatMessageImageSrc(message: ChatMessage): string | null {
  return (
    message.imageUrl ??
    (message.imageId ? chatImageDeliveryUrl(message.imageId) : null)
  );
}

function isImageMessage(message: ChatMessage): boolean {
  return Boolean(chatMessageImageSrc(message));
}

function canExtendAlbum(album: ChatMessage[], next: ChatMessage): boolean {
  if (next.from !== album[0].from || !isImageMessage(next)) return false;
  if (next.body.trim()) return false;

  const last = album[album.length - 1];
  const gap =
    new Date(next.sentAt).getTime() - new Date(last.sentAt).getTime();
  return gap >= 0 && gap <= ALBUM_MAX_GAP_MS;
}

/** Gom các tin ảnh liên tiếp (cùng người gửi) thành album để render grid. */
export function groupChatMessages(messages: ChatMessage[]): ChatMessageListItem[] {
  const items: ChatMessageListItem[] = [];
  let index = 0;

  while (index < messages.length) {
    const message = messages[index];
    if (!isImageMessage(message)) {
      items.push({ type: "single", message });
      index += 1;
      continue;
    }

    const album: ChatMessage[] = [message];
    let cursor = index + 1;
    while (cursor < messages.length && canExtendAlbum(album, messages[cursor])) {
      album.push(messages[cursor]);
      cursor += 1;
    }

    if (album.length >= 2) {
      items.push({
        type: "album",
        messages: album,
        sentAt: album[album.length - 1].sentAt,
        from: message.from,
      });
      index = cursor;
      continue;
    }

    items.push({ type: "single", message });
    index += 1;
  }

  return items;
}

export function albumGridColumnClass(count: number): string {
  if (count <= 2) return "cols-2";
  return "cols-3";
}
