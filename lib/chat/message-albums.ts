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

export type ChatMediaEntry = { id: string; src: string };

/** Ảnh đính kèm trong danh sách tin (mới nhất cuối mảng). Không gồm meme/sticker. */
export function chatMessageMediaEntries(messages: ChatMessage[]): ChatMediaEntry[] {
  return messages
    .map((message) => {
      if (message.kind === "sticker" || message.deleted) return null;
      const src = chatMessageImageSrc(message);
      return src ? { id: message.id, src } : null;
    })
    .filter((entry): entry is ChatMediaEntry => entry != null);
}

/** Ảnh chat thật — không tính meme (`sticker`). */
function isImageMessage(message: ChatMessage): boolean {
  if (message.deleted) return false;
  if (message.kind === "sticker") return false;
  if (message.albumImages?.length) return true;
  return Boolean(chatMessageImageSrc(message));
}

function albumPartsFromMessage(message: ChatMessage): ChatMessage[] {
  if (message.albumImages?.length) {
    return message.albumImages.map((image, index) => ({
      ...message,
      id: `${message.id}-part-${index}`,
      imageId: image.imageId,
      imageUrl: image.imageUrl,
      albumImages: undefined,
    }));
  }
  return [message];
}

function canExtendAlbum(album: ChatMessage[], next: ChatMessage): boolean {
  if (next.albumImages?.length) return false;
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

    if (message.albumImages?.length) {
      const album = albumPartsFromMessage(message);
      if (album.length >= 2) {
        items.push({
          type: "album",
          messages: album,
          sentAt: message.sentAt,
          from: message.from,
        });
      } else {
        items.push({ type: "single", message: album[0]! });
      }
      index += 1;
      continue;
    }

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
