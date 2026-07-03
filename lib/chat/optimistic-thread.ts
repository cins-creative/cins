import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import type { ChatPeerPreview, ChatThread, ChatThreadGroup } from "@/lib/chat/types";

export function pendingDirectRoomId(userId: string): string {
  return `pending-${userId}`;
}

export function buildOptimisticDirectThread(
  peer: ChatPeerPreview,
  group: ChatThreadGroup = "nguoi_la",
): ChatThread {
  const roomId = pendingDirectRoomId(peer.userId);
  const name = peer.name.trim() || "Người dùng";

  return {
    id: roomId,
    roomId,
    peerUserId: peer.userId,
    name,
    group,
    kind: "user",
    role: peer.role ?? "",
    avatarInitial: peer.avatarInitial ?? avatarInitialFromName(name),
    avatarHue: peer.avatarHue ?? avatarHueFromSeed(peer.userId),
    avatarUrl: peer.avatarUrl ?? null,
    preview: "Bắt đầu trò chuyện",
    lastAt: new Date().toISOString(),
    unread: 0,
    messages: [],
  };
}

export function isPendingRoomId(roomId: string): boolean {
  // `pending-<userId>`: DM optimistic · `org:<orgId>`: org optimistic —
  // cả hai chưa phải phòng thật (id thật là UUID), không được fetch messages.
  return roomId.startsWith("pending-") || roomId.startsWith("org:");
}
