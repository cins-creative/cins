import type { ChatMessage } from "@/lib/chat/types";
import {
  chatImageDeliveryUrl,
  isCloudflareImageId,
} from "@/lib/chat/image-url";
import { isOptimisticMessageId } from "@/lib/chat/optimistic-message";

/** Row INSERT từ Supabase Realtime — `chat_tin_nhan`. */
export type ChatRealtimeRow = {
  id: string;
  id_phong: string;
  id_nguoi_gui: string;
  noi_dung: string | null;
  loai_tin?: string | null;
  tao_luc: string;
  da_xoa: boolean;
};

export type ChatRealtimeMessageEvent = {
  roomId: string;
  message: ChatMessage;
  senderId: string;
  preview: string;
  lastAt: string;
};

export function mapRealtimeRow(row: ChatRealtimeRow, viewerId: string): ChatMessage {
  const kind = row.loai_tin === "media" ? "media" : "text";
  const rawBody = row.noi_dung?.trim() || "";
  let imageId: string | null = null;
  let body = rawBody;

  if (kind === "media") {
    if (isCloudflareImageId(rawBody)) {
      imageId = rawBody;
      body = "";
    } else {
      body = rawBody;
    }
  }

  return {
    id: row.id,
    from: row.id_nguoi_gui === viewerId ? "me" : "them",
    body,
    sentAt: row.tao_luc,
    kind,
    imageId,
    imageUrl: imageId ? chatImageDeliveryUrl(imageId) : null,
  };
}

function realtimePreview(row: ChatRealtimeRow): string {
  if (row.loai_tin === "media") {
    const caption = row.noi_dung?.trim() || "";
    if (caption && !isCloudflareImageId(caption)) return caption;
    return "Ảnh";
  }
  return row.noi_dung?.trim() || "";
}

export function toRealtimeMessageEvent(
  row: ChatRealtimeRow,
  viewerId: string,
): ChatRealtimeMessageEvent {
  return {
    roomId: row.id_phong,
    message: mapRealtimeRow(row, viewerId),
    senderId: row.id_nguoi_gui,
    preview: realtimePreview(row),
    lastAt: row.tao_luc,
  };
}

function sameOutgoingPayload(a: ChatMessage, b: ChatMessage): boolean {
  const aKind = a.kind ?? "text";
  const bKind = b.kind ?? "text";
  if (aKind !== bKind) return false;
  if ((a.imageId ?? null) !== (b.imageId ?? null)) return false;
  return a.body.trim() === b.body.trim();
}

/** Gộp tin realtime/API với bản optimistic đang chờ — tránh trùng bubble. */
export function reconcileChatMessage(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  if (messages.some((m) => m.id === message.id)) return messages;

  if (message.from === "me") {
    const optimisticIdx = messages.findIndex(
      (m) => isOptimisticMessageId(m.id) && sameOutgoingPayload(m, message),
    );
    if (optimisticIdx >= 0) {
      const next = [...messages];
      next[optimisticIdx] = message;
      return next;
    }
  }

  return [...messages, message];
}

export function appendChatMessageIfNew(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  return reconcileChatMessage(messages, message);
}
