import {
  createOptimisticAlbumMessage,
  createOptimisticChatMessage,
} from "@/lib/chat/optimistic-message";
import type { ChatMentionRef, ChatMessage, ChatMessageReplyPreview } from "@/lib/chat/types";

export type ChatSendPayload = {
  noi_dung?: string;
  cloudflare_image_id?: string;
  id_emoji_muc?: string;
  id_tin_tra_loi?: string;
};

export type ChatSendPlanItem = {
  payload: ChatSendPayload;
  optimistic: ChatMessage;
};

export type ChatSendPlan = {
  text?: ChatSendPlanItem;
  album?: {
    snapshots: Array<{
      localId: string;
      imageId: string | null;
      previewUrl: string;
    }>;
    optimistic: ChatMessage;
  };
};

/** Tối đa 2 bubble UI: 1 tin chữ + 1 album ảnh (dù backend lưu từng ảnh). */
export function buildChatSendPlan(input: {
  text: string;
  images: Array<{
    localId: string;
    imageId: string | null;
    previewUrl: string;
  }>;
  replyTo?: ChatMessageReplyPreview | null;
  mentions?: ChatMentionRef[];
}): ChatSendPlan {
  const plan: ChatSendPlan = {};
  const text = input.text.trim();
  const replyTo = input.replyTo ?? null;
  const mentions = input.mentions?.length ? input.mentions : undefined;

  if (text) {
    plan.text = {
      payload: {
        noi_dung: text,
        ...(replyTo ? { id_tin_tra_loi: replyTo.id } : {}),
      },
      optimistic: createOptimisticChatMessage({
        body: text,
        replyTo,
        mentions,
      }),
    };
  }

  if (input.images.length > 0) {
    const albumSentAt = new Date().toISOString();
    const attachReply = !text && replyTo;
    plan.album = {
      snapshots: input.images,
      optimistic: createOptimisticAlbumMessage({
        images: input.images.map((image) => ({
          imageId: image.imageId ?? image.localId,
          previewUrl: image.previewUrl,
        })),
        sentAt: albumSentAt,
        replyTo: attachReply ? replyTo : null,
      }),
    };
  }

  return plan;
}

export function optimisticMessagesFromPlan(plan: ChatSendPlan): ChatMessage[] {
  const out: ChatMessage[] = [];
  if (plan.text) out.push(plan.text.optimistic);
  if (plan.album) out.push(plan.album.optimistic);
  return out;
}
