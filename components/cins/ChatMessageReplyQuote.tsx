"use client";

import { replyPreviewLabel } from "@/lib/chat/reply-preview";
import type { ChatMessageReplyPreview } from "@/lib/chat/types";

type Props = {
  reply: ChatMessageReplyPreview;
  onJump?: () => void;
};

export function ChatMessageReplyQuote({ reply, onJump }: Props) {
  const label = replyPreviewLabel(reply);
  const hasImage = Boolean(!reply.deleted && reply.imageUrl);

  return (
    <button
      type="button"
      className={`cins-chat-reply-quote${reply.deleted ? " is-deleted" : ""}`}
      onClick={onJump}
      disabled={!onJump}
    >
      {hasImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={reply.imageUrl!} alt="" aria-hidden />
          <span>{label}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
