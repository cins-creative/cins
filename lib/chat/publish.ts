import "server-only";

import {
  CHAT_BROADCAST_EVENT,
  chatUserTopic,
  type ChatEnvelope,
  type ChatEnvelopeEvent,
} from "@/lib/chat/publish-types";
import { getTrimmedSupabaseUrl } from "@/lib/supabase/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export {
  CHAT_BROADCAST_EVENT,
  CHAT_USER_TOPIC_PREFIX,
  chatUserTopic,
  type ChatEnvelope,
  type ChatEnvelopeEvent,
} from "@/lib/chat/publish-types";

/** Phòng > trần này: bỏ publish, để CDC/poll lo (E14). */
export const CHAT_BROADCAST_FANOUT_CAP = 200;

const PUBLISH_TIMEOUT_MS = 2_500;

export function isChatBroadcastServerEnabled(): boolean {
  return process.env.CHAT_BROADCAST?.trim() === "on";
}

function envelopeKind(loaiTin: string | null | undefined): string {
  const t = (loaiTin ?? "text").trim();
  if (t === "system") return "moc_nhac";
  return t || "text";
}

function nguCanhLoai(nguCanh: unknown): string | null {
  if (!nguCanh || typeof nguCanh !== "object") return null;
  const loai = (nguCanh as { loai?: unknown }).loai;
  return typeof loai === "string" ? loai : null;
}

function previewForRoom(
  loaiPhong: string | null,
  nguCanh: unknown,
  noiDung: string | null,
  loaiTin: string | null,
): string {
  const phong = loaiPhong ?? "";
  if (phong === "1_org" || phong === "lop_hoc") {
    return "Tin nhắn mới";
  }
  const loai = nguCanhLoai(nguCanh);
  if (
    loai === "chao_lop" ||
    loai === "lop_bai" ||
    loai === "phong_lop"
  ) {
    return "Tin nhắn mới";
  }
  if (loaiTin === "sticker") return "Meme";
  if (loaiTin === "media") return "Ảnh";
  if (loaiTin === "binh_chon") {
    const q = noiDung?.trim() || "";
    return q ? `Bình chọn: ${q}` : "Bình chọn";
  }
  return (noiDung ?? "").trim().slice(0, 120) || "Tin nhắn mới";
}

type PublishInput = {
  roomId: string;
  messageId: string;
  senderId: string;
  sentAt: string;
  loaiTin?: string | null;
  noiDung?: string | null;
  nguCanh?: unknown;
  chiHienCho?: string[] | null;
  event: ChatEnvelopeEvent;
};

async function postBroadcast(messages: Array<{
  topic: string;
  event: string;
  payload: ChatEnvelope;
}>): Promise<void> {
  const url = getTrimmedSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || messages.length === 0) return;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PUBLISH_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal: ac.signal,
    });
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => "");
      console.error("[chat/publish] HTTP", res.status, text.slice(0, 200));
    }
  } catch (err) {
    console.error("[chat/publish]", err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fire-and-forget. Lỗi publish **không** được làm fail việc ghi tin.
 */
export function publishChatEnvelope(input: PublishInput): void {
  if (!isChatBroadcastServerEnabled()) return;
  const messageId = input.messageId?.trim();
  const roomId = input.roomId?.trim();
  const senderId = input.senderId?.trim();
  if (!messageId || !roomId || !senderId) return;

  void (async () => {
    try {
      const admin = createServiceRoleClient();
      const { listAllRoomMemberIds } = await import("@/lib/push/su-kien");
      const members = await listAllRoomMemberIds(roomId);
      const visible = input.chiHienCho?.length
        ? members.filter((id) => input.chiHienCho!.includes(id))
        : members;
      if (visible.length === 0) return;
      if (visible.length > CHAT_BROADCAST_FANOUT_CAP) return;

      const { data: phong } = await admin
        .from("chat_phong")
        .select("loai_phong")
        .eq("id", roomId)
        .maybeSingle<{ loai_phong: string | null }>();

      const envelope: ChatEnvelope = {
        roomId,
        messageId,
        senderId,
        sentAt: input.sentAt || new Date().toISOString(),
        kind: envelopeKind(input.loaiTin),
        preview: previewForRoom(
          phong?.loai_phong ?? null,
          input.nguCanh,
          input.noiDung ?? null,
          input.loaiTin ?? null,
        ),
        event: input.event,
      };

      await postBroadcast(
        visible.map((id) => ({
          topic: chatUserTopic(id),
          event: CHAT_BROADCAST_EVENT,
          payload: envelope,
        })),
      );
    } catch (err) {
      console.error("[chat/publish] fanout", err);
    }
  })();
}

export function publishChatEnvelopeFromInsertedRow(
  row: Record<string, unknown>,
  inserted: Record<string, unknown> | null,
): void {
  const merged = { ...row, ...(inserted ?? {}) };
  const roomId = typeof merged.id_phong === "string" ? merged.id_phong : "";
  const messageId = typeof merged.id === "string" ? merged.id : "";
  const senderId =
    typeof merged.id_nguoi_gui === "string" ? merged.id_nguoi_gui : "";
  const sentAt =
    typeof merged.tao_luc === "string"
      ? merged.tao_luc
      : new Date().toISOString();
  publishChatEnvelope({
    roomId,
    messageId,
    senderId,
    sentAt,
    loaiTin:
      typeof merged.loai_tin === "string" ? merged.loai_tin : null,
    noiDung: typeof merged.noi_dung === "string" ? merged.noi_dung : null,
    nguCanh: merged.ngu_canh,
    chiHienCho: Array.isArray(merged.chi_hien_cho)
      ? (merged.chi_hien_cho as string[])
      : null,
    event: "insert",
  });
}
