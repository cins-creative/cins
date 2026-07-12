import type { ChatGroupMemberAvatar, ChatMessage } from "@/lib/chat/types";

/** Bổ sung tên/slug/avatar từ roster nhóm (realtime chưa enrich). */
export function applyKnownGroupSender(
  message: ChatMessage,
  members: ChatGroupMemberAvatar[] | undefined,
): ChatMessage {
  if (message.from === "me" || !message.senderUserId || !members?.length) {
    return message;
  }
  const member = members.find((m) => m.userId === message.senderUserId);
  if (!member) return message;
  return {
    ...message,
    senderSlug: message.senderSlug ?? member.slug,
    senderName: message.senderName ?? member.name,
    senderAvatarInitial: message.senderAvatarInitial ?? member.initial,
    senderAvatarHue: message.senderAvatarHue ?? member.hue,
    senderAvatarUrl: message.senderAvatarUrl ?? member.avatarUrl ?? null,
  };
}
