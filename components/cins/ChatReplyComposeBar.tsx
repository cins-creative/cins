"use client";

import { X } from "lucide-react";

import { replyPreviewLabel } from "@/lib/chat/reply-preview";
import type { ChatMessage } from "@/lib/chat/types";
import { useT } from "@/lib/i18n/use-t";

type Props = {
  target: ChatMessage;
  onCancel: () => void;
};

export function ChatReplyComposeBar({ target, onCancel }: Props) {
  const t = useT();
  const preview =
    target.deleted
      ? t("chat.recalled")
      : target.kind === "media" || target.imageUrl
        ? target.body.trim() || t("chat.photo")
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
        <span className="cins-chat-reply-compose-label">{t("chat.reply")}</span>
        <p>{preview}</p>
      </div>
      <button
        type="button"
        className="cins-chat-icon-btn"
        aria-label={t("chat.cancelReply")}
        onClick={onCancel}
      >
        <X size={14} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}
