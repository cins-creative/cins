"use client";

import { X } from "lucide-react";

import { replyPreviewLabel } from "@/lib/chat/reply-preview";
import type { ChatMessage } from "@/lib/chat/types";

type Props = {
  target: ChatMessage;
  onCancel: () => void;
};

export function ChatReplyComposeBar({ target, onCancel }: Props) {
  const preview =
    target.deleted
      ? "Tin nhắn đã được thu hồi"
      : target.kind === "media" || target.imageUrl
        ? target.body.trim() || "Ảnh"
        : target.body.trim() || replyPreviewLabel({
            id: target.id,
            from: target.from,
            body: target.body,
            kind: target.kind,
            imageUrl: target.imageUrl,
            deleted: target.deleted,
          });

  return (
    <div className="cins-chat-reply-compose">
      <div className="cins-chat-reply-compose-body">
        <span className="cins-chat-reply-compose-label">Trả lời</span>
        <p>{preview}</p>
      </div>
      <button
        type="button"
        className="cins-chat-icon-btn"
        aria-label="Huỷ trả lời"
        onClick={onCancel}
      >
        <X size={14} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}
