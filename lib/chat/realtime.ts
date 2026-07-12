import type { ChatMessage } from "@/lib/chat/types";
import {
  chatImageDeliveryUrl,
  isCloudflareImageId,
} from "@/lib/chat/image-url";
import { parseChatNguCanh } from "@/lib/chat/message-perspective";
import { isOptimisticAlbumMessage, isOptimisticMessageId } from "@/lib/chat/optimistic-message";

/** Row từ Supabase Realtime — `chat_tin_nhan`. */
export type ChatRealtimeRow = {
  id: string;
  id_phong: string;
  id_nguoi_gui: string;
  noi_dung: string | null;
  loai_tin?: string | null;
  tao_luc: string;
  da_xoa: boolean;
  da_sua?: boolean;
  sua_luc?: string | null;
  id_tin_tra_loi?: string | null;
  ngu_canh?: unknown;
};

export type ChatRealtimeMessageEvent = {
  roomId: string;
  message: ChatMessage;
  senderId: string;
  preview: string;
  lastAt: string;
  event: "insert" | "update";
};

export function mapRealtimeRow(row: ChatRealtimeRow, viewerId: string): ChatMessage {
  const nguCanh = parseChatNguCanh(row.ngu_canh);
  const kind = nguCanh
    ? "context"
    : row.loai_tin === "sticker"
      ? "sticker"
      : row.loai_tin === "media"
        ? "media"
        : "text";
  const rawBody = row.noi_dung?.trim() || "";
  let imageId: string | null = null;
  let body = rawBody;

  if (kind === "media" || kind === "sticker") {
    if (isCloudflareImageId(rawBody)) {
      imageId = rawBody;
      body = "";
    } else {
      body = rawBody;
    }
  } else if (kind === "context") {
    body = rawBody;
  }

  return {
    id: row.id,
    from: row.id_nguoi_gui === viewerId ? "me" : "them",
    senderUserId: row.id_nguoi_gui,
    body,
    sentAt: row.tao_luc,
    kind,
    imageId,
    imageUrl: imageId ? chatImageDeliveryUrl(imageId) : null,
    deleted: Boolean(row.da_xoa),
    edited: Boolean(row.da_sua),
    editedAt: row.sua_luc ?? null,
    nguCanh,
  };
}

function realtimePreview(row: ChatRealtimeRow): string {
  if (row.da_xoa) return "Đã thu hồi tin nhắn";
  const nguCanh = parseChatNguCanh(row.ngu_canh);
  if (nguCanh) return `Trao đổi về: ${nguCanh.tieuDe}`;
  if (row.loai_tin === "sticker") return "Meme";
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
  event: "insert" | "update" = "insert",
): ChatRealtimeMessageEvent {
  return {
    roomId: row.id_phong,
    message: mapRealtimeRow(row, viewerId),
    senderId: row.id_nguoi_gui,
    preview: realtimePreview(row),
    lastAt: row.tao_luc,
    event,
  };
}

function sameOutgoingPayload(a: ChatMessage, b: ChatMessage): boolean {
  const aKind = a.kind ?? "text";
  const bKind = b.kind ?? "text";
  if (aKind === "context" || bKind === "context") {
    if (aKind !== "context" || bKind !== "context") return false;
    return (a.nguCanh?.id ?? null) === (b.nguCanh?.id ?? null);
  }
  if (aKind !== bKind) return false;
  if ((a.imageId ?? null) !== (b.imageId ?? null)) return false;
  return a.body.trim() === b.body.trim();
}

export type ReconcileChatMessageOptions = {
  /** Album optimistic đang gửi (ref đồng bộ) — bỏ qua ảnh self từ realtime trước khi React kịp render optimistic. */
  pendingAlbumOptimisticId?: string | null;
};

function isSelfMediaMessage(message: ChatMessage): boolean {
  return (
    message.from === "me" &&
    message.kind === "media" &&
    Boolean(message.imageId || message.imageUrl)
  );
}

function isSelfStickerMessage(message: ChatMessage): boolean {
  return message.from === "me" && message.kind === "sticker";
}

/** Gộp tin realtime/API với bản optimistic đang chờ — tránh trùng bubble. */
export function reconcileChatMessage(
  messages: ChatMessage[],
  message: ChatMessage,
  options?: ReconcileChatMessageOptions,
): ChatMessage[] {
  if (messages.some((m) => m.id === message.id)) {
    return messages.map((m) => {
      if (m.id !== message.id) return m;
      return {
        ...m,
        ...message,
        nguCanh: message.nguCanh ?? m.nguCanh,
        replyTo: message.replyTo ?? m.replyTo,
        reactions: message.reactions ?? m.reactions,
        pinned: message.pinned ?? m.pinned,
        readByPeer: message.readByPeer ?? m.readByPeer,
        senderUserId: message.senderUserId ?? m.senderUserId,
        senderSlug: message.senderSlug ?? m.senderSlug,
        senderName: message.senderName ?? m.senderName,
        senderAvatarInitial: message.senderAvatarInitial ?? m.senderAvatarInitial,
        senderAvatarHue: message.senderAvatarHue ?? m.senderAvatarHue,
        senderAvatarUrl: message.senderAvatarUrl ?? m.senderAvatarUrl,
        senderRole: message.senderRole ?? m.senderRole,
      };
    });
  }

  if (isSelfMediaMessage(message)) {
    const hasOptimisticAlbum = messages.some((m) => isOptimisticAlbumMessage(m));
    if (options?.pendingAlbumOptimisticId || hasOptimisticAlbum) {
      return messages;
    }
  }

  if (message.from === "me") {
    const optimisticIdx = messages.findIndex(
      (m) =>
        isOptimisticMessageId(m.id) &&
        (sameOutgoingPayload(m, message) ||
          (isSelfStickerMessage(message) &&
            isSelfStickerMessage(m) &&
            (m.imageId ?? null) === (message.imageId ?? null))),
    );
    if (optimisticIdx >= 0) {
      const next = [...messages];
      const prev = next[optimisticIdx]!;
      next[optimisticIdx] = {
        ...prev,
        ...message,
        nguCanh: message.nguCanh ?? prev.nguCanh,
      };
      return next;
    }
  }

  return [...messages, message];
}

export function mergeChatMessageUpdate(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  const idx = messages.findIndex((m) => m.id === message.id);
  if (idx < 0) return messages;
  const prev = messages[idx];
  const next = [...messages];
  next[idx] = {
    ...prev,
    ...message,
    replyTo: message.replyTo ?? prev.replyTo,
    reactions: message.reactions ?? prev.reactions,
    pinned: message.pinned ?? prev.pinned,
    readByPeer: message.readByPeer ?? prev.readByPeer,
    nguCanh: message.nguCanh ?? prev.nguCanh,
    senderUserId: message.senderUserId ?? prev.senderUserId,
    senderSlug: message.senderSlug ?? prev.senderSlug,
    senderName: message.senderName ?? prev.senderName,
    senderAvatarInitial: message.senderAvatarInitial ?? prev.senderAvatarInitial,
    senderAvatarHue: message.senderAvatarHue ?? prev.senderAvatarHue,
    senderAvatarUrl: message.senderAvatarUrl ?? prev.senderAvatarUrl,
    senderRole: message.senderRole ?? prev.senderRole,
  };
  return next;
}

export function appendChatMessageIfNew(
  messages: ChatMessage[],
  message: ChatMessage,
  options?: ReconcileChatMessageOptions,
): ChatMessage[] {
  return reconcileChatMessage(messages, message, options);
}
