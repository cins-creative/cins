"use client";

import { CornerUpLeft, Copy, MoreHorizontal, Pencil, Pin, Smile, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CHAT_ACTION_WINDOW_MS, CHAT_REACTION_EMOJIS } from "@/lib/chat/constants";
import type { ChatMessage } from "@/lib/chat/types";

export type ChatMessageActionHandlers = {
  onReply: (msg: ChatMessage) => void;
  onRecall: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onPin: (msg: ChatMessage, pinned: boolean) => void;
  onReaction: (msg: ChatMessage, emoji: string, active: boolean) => void;
};

type Props = {
  msg: ChatMessage;
  handlers: ChatMessageActionHandlers;
};

function canModify(msg: ChatMessage): boolean {
  if (msg.from !== "me" || msg.deleted) return false;
  return Date.now() - new Date(msg.sentAt).getTime() <= CHAT_ACTION_WINDOW_MS;
}

export function ChatMessageActions({ msg, handlers }: Props) {
  const [open, setOpen] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !showReact) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowReact(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, showReact]);

  if (msg.deleted) return null;

  const modifiable = canModify(msg);
  const isText = msg.kind !== "media" && !msg.imageId;

  const copyText = async () => {
    const text =
      msg.body.trim() ||
      (msg.imageUrl ? msg.imageUrl : "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="cins-chat-msg-actions" ref={rootRef}>
      <button
        type="button"
        className="cins-chat-msg-action-btn"
        aria-label="Thả reaction"
        onClick={() => {
          setShowReact((v) => !v);
          setOpen(false);
        }}
      >
        <Smile size={14} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        className="cins-chat-msg-action-btn"
        aria-label="Thêm hành động"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setShowReact(false);
        }}
      >
        <MoreHorizontal size={14} strokeWidth={1.8} aria-hidden />
      </button>

      {showReact ? (
        <div className="cins-chat-msg-react-picker" role="menu">
          {CHAT_REACTION_EMOJIS.map((emoji) => {
            const existing = msg.reactions?.find((r) => r.emoji === emoji);
            return (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                className={existing?.viewerReacted ? "is-active" : undefined}
                aria-label={`Reaction ${emoji}`}
                onClick={() => {
                  handlers.onReaction(msg, emoji, !existing?.viewerReacted);
                  setShowReact(false);
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div className="cins-chat-msg-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { handlers.onReply(msg); setOpen(false); }}>
            <CornerUpLeft size={14} aria-hidden />
            Trả lời
          </button>
          <button type="button" role="menuitem" onClick={() => void copyText()}>
            <Copy size={14} aria-hidden />
            Sao chép
          </button>
          {modifiable && isText ? (
            <button type="button" role="menuitem" onClick={() => { handlers.onEdit(msg); setOpen(false); }}>
              <Pencil size={14} aria-hidden />
              Sửa
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handlers.onPin(msg, !msg.pinned);
              setOpen(false);
            }}
          >
            <Pin size={14} aria-hidden />
            {msg.pinned ? "Bỏ ghim" : "Ghim"}
          </button>
          {modifiable ? (
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                handlers.onRecall(msg);
                setOpen(false);
              }}
            >
              <Trash2 size={14} aria-hidden />
              Thu hồi
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
