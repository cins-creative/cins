"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import { Pin } from "lucide-react";

import {
  ChatMessageActions,
  type ChatMessageActionHandlers,
} from "@/components/cins/ChatMessageActions";
import { ChatMessageAlbum } from "@/components/cins/ChatMessageAlbum";
import { ChatMessageBody } from "@/components/cins/ChatMessageBody";
import { ChatMessageReactions } from "@/components/cins/ChatMessageReactions";
import { ChatMessageReplyQuote } from "@/components/cins/ChatMessageReplyQuote";
import { formatChatTime } from "@/lib/chat/avatar";
import { groupChatMessages } from "@/lib/chat/message-albums";
import type { ChatMessage } from "@/lib/chat/types";

type ChatMessageThreadItemsProps = {
  messages: ChatMessage[];
  renderTheirAvatar?: () => ReactNode;
  actionHandlers?: ChatMessageActionHandlers;
  editingMessageId?: string | null;
  editingDraft?: string;
  onEditingDraftChange?: (value: string) => void;
  onSaveEdit?: (msg: ChatMessage) => void;
  onCancelEdit?: () => void;
};

function recalledLabel(msg: ChatMessage): string {
  return msg.from === "me" ? "Bạn đã thu hồi tin nhắn" : "Tin nhắn đã được thu hồi";
}

function PinBadge() {
  return (
    <span className="cins-chat-pin-badge" aria-label="Tin đã ghim">
      <Pin size={11} strokeWidth={2.2} fill="currentColor" aria-hidden />
    </span>
  );
}

function messageRowId(messageId: string): string {
  return `cins-chat-msg-${messageId}`;
}

function BubbleMeta({ msg }: { msg: ChatMessage }) {
  return (
    <span className="cins-chat-bubble-meta">
      {msg.edited ? <span className="cins-chat-edited">đã sửa</span> : null}
      <time dateTime={msg.sentAt}>{formatChatTime(msg.sentAt)}</time>
      {msg.from === "me" && msg.readByPeer ? (
        <span className="cins-chat-read" aria-label="Đã xem">
          ✓✓
        </span>
      ) : null}
    </span>
  );
}

function SingleMessageBubble({
  msg,
  renderTheirAvatar,
  actionHandlers,
  editingMessageId,
  editingDraft,
  onEditingDraftChange,
  onSaveEdit,
  onCancelEdit,
}: {
  msg: ChatMessage;
  renderTheirAvatar?: () => ReactNode;
  actionHandlers?: ChatMessageActionHandlers;
  editingMessageId?: string | null;
  editingDraft?: string;
  onEditingDraftChange?: (value: string) => void;
  onSaveEdit?: (msg: ChatMessage) => void;
  onCancelEdit?: () => void;
}) {
  const isMe = msg.from === "me";
  const isEditing = editingMessageId === msg.id;
  const hasImage = Boolean(!msg.deleted && (msg.imageId || msg.imageUrl));
  const actionsInBubble = hasImage && !isEditing;

  if (msg.deleted) {
    return (
      <div
        id={messageRowId(msg.id)}
        className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${msg.pinned ? " is-pinned-row" : ""}`}
      >
        {msg.from === "them" ? renderTheirAvatar?.() : null}
        <div className={`cins-chat-bubble is-recalled${isMe ? " is-me" : " is-them"}`}>
          <p className="cins-chat-recalled">{recalledLabel(msg)}</p>
          <BubbleMeta msg={msg} />
        </div>
      </div>
    );
  }

  return (
    <div
      id={messageRowId(msg.id)}
      className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${msg.pinned ? " is-pinned-row" : ""}`}
    >
      {msg.from === "them" ? renderTheirAvatar?.() : null}
      <div className="cins-chat-bubble-wrap">
        <div
          className={`cins-chat-bubble${isMe ? " is-me" : " is-them"}${hasImage ? " has-image has-media-actions" : ""}${msg.pinned ? " is-pinned" : ""}${isEditing ? " is-editing" : ""}`}
        >
          {msg.pinned && !isEditing ? <PinBadge /> : null}
          {msg.replyTo ? <ChatMessageReplyQuote reply={msg.replyTo} /> : null}
          {isEditing ? (
            <div className="cins-chat-edit-form">
              <textarea
                rows={2}
                value={editingDraft ?? msg.body}
                onChange={(e) => onEditingDraftChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSaveEdit?.(msg);
                  }
                  if (e.key === "Escape") onCancelEdit?.();
                }}
              />
              <div className="cins-chat-edit-actions">
                <button type="button" onClick={onCancelEdit}>
                  Huỷ
                </button>
                <button type="button" className="is-primary" onClick={() => onSaveEdit?.(msg)}>
                  Lưu
                </button>
              </div>
            </div>
          ) : (
            <ChatMessageBody msg={msg} />
          )}
          {!isEditing ? <BubbleMeta msg={msg} /> : null}
          {!isEditing && msg.reactions?.length && actionHandlers ? (
            <ChatMessageReactions
              placement="corner"
              reactions={msg.reactions}
              onToggle={(emoji, active) => actionHandlers.onReaction(msg, emoji, active)}
            />
          ) : null}
          {actionHandlers && actionsInBubble ? (
            <ChatMessageActions msg={msg} handlers={actionHandlers} />
          ) : null}
        </div>
        {actionHandlers && !actionsInBubble ? (
          <ChatMessageActions msg={msg} handlers={actionHandlers} />
        ) : null}
      </div>
    </div>
  );
}

export function ChatMessageThreadItems({
  messages,
  renderTheirAvatar,
  actionHandlers,
  editingMessageId,
  editingDraft,
  onEditingDraftChange,
  onSaveEdit,
  onCancelEdit,
}: ChatMessageThreadItemsProps) {
  const items = useMemo(() => groupChatMessages(messages), [messages]);

  return (
    <>
      {items.map((item) => {
        if (item.type === "single") {
          const msg = item.message;
          return (
            <SingleMessageBubble
              key={msg.id}
              msg={msg}
              renderTheirAvatar={renderTheirAvatar}
              actionHandlers={actionHandlers}
              editingMessageId={editingMessageId}
              editingDraft={editingDraft}
              onEditingDraftChange={onEditingDraftChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          );
        }

        const firstId = item.messages[0].id;
        const isMe = item.from === "me";
        const activeMessages = item.messages.filter((m) => !m.deleted);
        const allRecalled = activeMessages.length === 0;

        if (allRecalled) {
          const msg = item.messages[0];
          return (
            <SingleMessageBubble
              key={`recalled-album-${firstId}`}
              msg={{ ...msg, deleted: true }}
              renderTheirAvatar={renderTheirAvatar}
              actionHandlers={actionHandlers}
            />
          );
        }

        const captionMsg = item.messages.find((m) => m.body.trim() && !m.deleted);
        const caption = captionMsg?.body.trim() ?? "";
        const captionAt = captionMsg?.sentAt ?? item.sentAt;
        const albumActionMsg = captionMsg ?? activeMessages[0];

        return (
          <Fragment key={`album-${firstId}`}>
            {caption ? (
              <div
                id={captionMsg ? messageRowId(captionMsg.id) : undefined}
                className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${captionMsg?.pinned ? " is-pinned-row" : ""}`}
              >
                {item.from === "them" ? renderTheirAvatar?.() : null}
                <div className="cins-chat-bubble-wrap">
                  <div
                    className={`cins-chat-bubble${isMe ? " is-me" : " is-them"} has-media-actions${captionMsg?.pinned ? " is-pinned" : ""}`}
                  >
                    {captionMsg?.pinned ? <PinBadge /> : null}
                    <p>{caption}</p>
                    <BubbleMeta msg={captionMsg ?? item.messages[0]} />
                    {actionHandlers && albumActionMsg ? (
                      <ChatMessageActions
                        msg={albumActionMsg}
                        handlers={actionHandlers}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            <div
              id={
                !caption && albumActionMsg
                  ? messageRowId(albumActionMsg.id)
                  : undefined
              }
              className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${!isMe && caption ? " is-album-follow" : ""}${!caption && albumActionMsg?.pinned ? " is-pinned-row" : ""}`}
            >
              {item.from === "them" && !caption ? renderTheirAvatar?.() : null}
              <div className="cins-chat-bubble-wrap">
                <div
                  className={`cins-chat-bubble has-image has-album has-media-actions${isMe ? " is-me" : " is-them"}${!caption && albumActionMsg?.pinned ? " is-pinned" : ""}`}
                >
                  {!caption && albumActionMsg?.pinned ? <PinBadge /> : null}
                  <div className="cins-chat-album-block">
                    <ChatMessageAlbum messages={activeMessages} />
                    <time className="cins-chat-album-time" dateTime={item.sentAt}>
                      {formatChatTime(captionAt)}
                    </time>
                  </div>
                  {!caption && actionHandlers && albumActionMsg ? (
                    <ChatMessageActions
                      msg={albumActionMsg}
                      handlers={actionHandlers}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
