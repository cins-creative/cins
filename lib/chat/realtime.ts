import type { ChatMessage } from "@/lib/chat/types";

/** Row INSERT từ Supabase Realtime — `chat_tin_nhan`. */
export type ChatRealtimeRow = {
  id: string;
  id_phong: string;
  id_nguoi_gui: string;
  noi_dung: string | null;
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
  return {
    id: row.id,
    from: row.id_nguoi_gui === viewerId ? "me" : "them",
    body: row.noi_dung?.trim() || "",
    sentAt: row.tao_luc,
  };
}

export function toRealtimeMessageEvent(
  row: ChatRealtimeRow,
  viewerId: string,
): ChatRealtimeMessageEvent {
  return {
    roomId: row.id_phong,
    message: mapRealtimeRow(row, viewerId),
    senderId: row.id_nguoi_gui,
    preview: row.noi_dung?.trim() || "",
    lastAt: row.tao_luc,
  };
}

export function appendChatMessageIfNew(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  if (messages.some((m) => m.id === message.id)) return messages;
  return [...messages, message];
}
