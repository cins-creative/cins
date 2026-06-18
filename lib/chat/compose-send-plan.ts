import { createOptimisticChatMessage } from "@/lib/chat/optimistic-message";
import type { ChatMessage, ChatMessageReplyPreview } from "@/lib/chat/types";

export type ChatSendPayload = {
  noi_dung?: string;
  cloudflare_image_id?: string;
  id_tin_tra_loi?: string;
};

export type ChatSendPlanItem = {
  payload: ChatSendPayload;
  optimistic: ChatMessage;
};

/** Tin nhắn chữ và ảnh tách riêng; nhiều ảnh cùng timestamp để render album grid ngay. */
export function buildChatSendPlan(input: {
  text: string;
  images: Array<{ imageId: string; previewUrl: string }>;
  replyTo?: ChatMessageReplyPreview | null;
}): ChatSendPlanItem[] {
  const sends: ChatSendPlanItem[] = [];
  const text = input.text.trim();
  const replyTo = input.replyTo ?? null;

  if (text) {
    sends.push({
      payload: {
        noi_dung: text,
        ...(replyTo ? { id_tin_tra_loi: replyTo.id } : {}),
      },
      optimistic: createOptimisticChatMessage({
        body: text,
        replyTo,
      }),
    });
  }

  if (input.images.length > 0) {
    const albumSentAt = new Date().toISOString();
    input.images.forEach((image, index) => {
      const attachReply = index === 0 && !text && replyTo;
      sends.push({
        payload: {
          cloudflare_image_id: image.imageId,
          ...(attachReply ? { id_tin_tra_loi: replyTo.id } : {}),
        },
        optimistic: createOptimisticChatMessage({
          body: "",
          imageId: image.imageId,
          imageUrl: image.previewUrl,
          sentAt: albumSentAt,
          replyTo: attachReply ? replyTo : null,
        }),
      });
    });
  }

  return sends;
}
