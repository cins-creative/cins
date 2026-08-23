"use client";

import { useRef } from "react";

import { replyPreviewLabel } from "@/lib/chat/reply-preview";
import type { ChatMessageReplyPreview } from "@/lib/chat/types";

const JUMP_TAP_MAX_PX = 12;
const JUMP_DEDUP_MS = 400;

type Props = {
  reply: ChatMessageReplyPreview;
  onJump?: () => void;
};

export function ChatMessageReplyQuote({ reply, onJump }: Props) {
  const label = replyPreviewLabel(reply);
  const hasImage = Boolean(!reply.deleted && reply.imageUrl);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lastJumpAtRef = useRef(0);

  const jump = () => {
    if (!onJump) return;
    const now = Date.now();
    if (now - lastJumpAtRef.current < JUMP_DEDUP_MS) return;
    lastJumpAtRef.current = now;
    onJump();
  };

  return (
    <button
      type="button"
      className={`cins-chat-reply-quote${reply.deleted ? " is-deleted" : ""}${onJump ? " is-jumpable" : ""}`}
      aria-label={onJump ? "Xem tin được trả lời" : undefined}
      disabled={!onJump}
      onPointerDown={(event) => {
        if (!onJump) return;
        event.stopPropagation();
        startRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!onJump) return;
        const start = startRef.current;
        startRef.current = null;
        if (!start) return;
        if (
          Math.abs(event.clientX - start.x) > JUMP_TAP_MAX_PX ||
          Math.abs(event.clientY - start.y) > JUMP_TAP_MAX_PX
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        jump();
      }}
      onPointerCancel={() => {
        startRef.current = null;
      }}
      onClick={(event) => {
        if (!onJump) return;
        event.stopPropagation();
        jump();
      }}
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
