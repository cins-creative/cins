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
import {
  chatMessageHasInteractiveMedia,
  chatMessageMediaLayout,
} from "@/lib/chat/message-media-layout";
import type { ChatMessage } from "@/lib/chat/types";

type ChatMessageThreadItemsProps = {
  messages: ChatMessage[];
  renderTheirAvatar?: (msg: ChatMessage) => ReactNode;
  showSenderNames?: boolean;
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

function BubbleMeta({
  msg,
  className,
}: {
  msg: ChatMessage;
  className?: string;
}) {
  return (
    <span className={["cins-chat-bubble-meta", className].filter(Boolean).join(" ")}>
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

function bubbleClassName(
  msg: ChatMessage,
  isMe: boolean,
  isEditing: boolean,
): string {
  const layout = chatMessageMediaLayout(msg);
  const parts = ["cins-chat-bubble", isMe ? "is-me" : "is-them"];

  if (msg.pinned) parts.push("is-pinned");
  if (isEditing) parts.push("is-editing");

  if (layout === "media-only") {
    parts.push("has-media-card", "has-media-actions");
  } else if (layout === "sticker") {
    parts.push("is-sticker-only", "has-media-actions");
  } else if (layout === "media-caption") {
    parts.push("has-media-with-caption", "has-media-actions");
  }

  return parts.join(" ");
}

function SingleMessageBubble({
  msg,
  renderTheirAvatar,
  showSenderNames,
  actionHandlers,
  editingMessageId,
  editingDraft,
  onEditingDraftChange,
  onSaveEdit,
  onCancelEdit,
}: {
  msg: ChatMessage;
  renderTheirAvatar?: (msg: ChatMessage) => ReactNode;
  showSenderNames?: boolean;
  actionHandlers?: ChatMessageActionHandlers;
  editingMessageId?: string | null;
  editingDraft?: string;
  onEditingDraftChange?: (value: string) => void;
  onSaveEdit?: (msg: ChatMessage) => void;
  onCancelEdit?: () => void;
}) {
  const isMe = msg.from === "me";
  const isEditing = editingMessageId === msg.id;
  const layout = chatMessageMediaLayout(msg);
  const actionsInBubble = chatMessageHasInteractiveMedia(msg) && !isEditing;
  const caption = layout === "media-caption" ? msg.body.trim() : "";

  if (msg.deleted) {
    return (
      <div
        id={messageRowId(msg.id)}
        className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${msg.pinned ? " is-pinned-row" : ""}`}
      >
        {msg.from === "them" ? renderTheirAvatar?.(msg) : null}
        <div className={`cins-chat-bubble is-recalled${isMe ? " is-me" : " is-them"}`}>
          <p className="cins-chat-recalled">{recalledLabel(msg)}</p>
          <BubbleMeta msg={msg} />
        </div>
      </div>
    );
  }

  const rowClass = [
    "cins-chat-bubble-row",
    isMe ? "is-me" : "is-them",
    msg.pinned ? "is-pinned-row" : "",
    layout === "media-only" || layout === "sticker" ? "is-media-row" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const metaBelowMedia =
    !isEditing && (layout === "media-only" || layout === "sticker") ? (
      <BubbleMeta msg={msg} className="cins-chat-media-meta" />
    ) : null;

  const bodyContent = isEditing ? (
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
  ) : layout === "media-caption" ? (
    <>
      <div className="cins-chat-media-block">
        <ChatMessageBody msg={msg} mediaOnly />
      </div>
      <div className="cins-chat-media-caption">
        <p>{caption}</p>
        <BubbleMeta msg={msg} />
      </div>
    </>
  ) : layout === "media-only" || layout === "sticker" ? (
    <div className="cins-chat-media-block">
      <ChatMessageBody msg={msg} />
      {metaBelowMedia}
    </div>
  ) : (
    <>
      <ChatMessageBody msg={msg} />
      {!isEditing ? <BubbleMeta msg={msg} /> : null}
    </>
  );

  return (
    <div id={messageRowId(msg.id)} className={rowClass}>
      {msg.from === "them" ? renderTheirAvatar?.(msg) : null}
      <div className="cins-chat-bubble-wrap">
        {showSenderNames && msg.from === "them" && msg.senderName ? (
          <span className="cins-chat-sender-name">{msg.senderName}</span>
        ) : null}
        <div className={bubbleClassName(msg, isMe, isEditing)}>
          {msg.pinned && !isEditing ? <PinBadge /> : null}
          {msg.replyTo ? <ChatMessageReplyQuote reply={msg.replyTo} /> : null}
          {bodyContent}
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
  showSenderNames = false,
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
              showSenderNames={showSenderNames}
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
              showSenderNames={showSenderNames}
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
                {item.from === "them" ? renderTheirAvatar?.(captionMsg ?? item.messages[0]) : null}
                <div className="cins-chat-bubble-wrap">
                  {showSenderNames &&
                  item.from === "them" &&
                  (captionMsg ?? item.messages[0]).senderName ? (
                    <span className="cins-chat-sender-name">
                      {(captionMsg ?? item.messages[0]).senderName}
                    </span>
                  ) : null}
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
              className={`cins-chat-bubble-row is-media-row ${isMe ? "is-me" : "is-them"}${!isMe && caption ? " is-album-follow" : ""}${!caption && albumActionMsg?.pinned ? " is-pinned-row" : ""}`}
            >
              {item.from === "them" && !caption
                ? renderTheirAvatar?.(albumActionMsg ?? item.messages[0])
                : null}
              <div className="cins-chat-bubble-wrap">
                {showSenderNames &&
                item.from === "them" &&
                !caption &&
                (albumActionMsg ?? item.messages[0]).senderName ? (
                  <span className="cins-chat-sender-name">
                    {(albumActionMsg ?? item.messages[0]).senderName}
                  </span>
                ) : null}
                <div
                  className={`cins-chat-bubble has-album has-media-actions${isMe ? " is-me" : " is-them"}${!caption && albumActionMsg?.pinned ? " is-pinned" : ""}`}
                >
                  {!caption && albumActionMsg?.pinned ? <PinBadge /> : null}
                  <div className="cins-chat-media-block">
                    <ChatMessageAlbum messages={activeMessages} />
                    {!caption ? (
                      <BubbleMeta
                        msg={albumActionMsg ?? item.messages[0]}
                        className="cins-chat-media-meta"
                      />
                    ) : (
                      <time className="cins-chat-media-meta" dateTime={item.sentAt}>
                        {formatChatTime(captionAt)}
                      </time>
                    )}
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
