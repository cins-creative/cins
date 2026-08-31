/**
 * Type + hằng số envelope — **không** `server-only`, để client subscribe
 * cùng topic/event với `lib/chat/publish.ts`.
 */

export const CHAT_USER_TOPIC_PREFIX = "cins-user:";
export const CHAT_BROADCAST_EVENT = "envelope";

export type ChatEnvelopeEvent = "insert" | "update";

export type ChatEnvelope = {
  roomId: string;
  messageId: string;
  senderId: string;
  sentAt: string;
  kind: string;
  preview: string;
  event: ChatEnvelopeEvent;
};

export function chatUserTopic(profileId: string): string {
  return `${CHAT_USER_TOPIC_PREFIX}${profileId}`;
}
