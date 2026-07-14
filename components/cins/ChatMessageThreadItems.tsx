"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import { Pin } from "lucide-react";

import {
  ChatMessageActions,
  type ChatMessageActionHandlers,
} from "@/components/cins/ChatMessageActions";
import { ChatMessageAlbum } from "@/components/cins/ChatMessageAlbum";
import { ChatMessageBody } from "@/components/cins/ChatMessageBody";
import { ChatMentionText } from "@/components/cins/ChatMentionText";
import { ChatMessageReactions } from "@/components/cins/ChatMessageReactions";
import { ChatMessageReplyQuote } from "@/components/cins/ChatMessageReplyQuote";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { avatarBg, formatChatTime } from "@/lib/chat/avatar";
import { groupChatMessages } from "@/lib/chat/message-albums";
import {
  chatMessageHasInteractiveMedia,
  chatMessageMediaLayout,
} from "@/lib/chat/message-media-layout";
import {
  CHAT_SEEN_AVATARS_MAX,
  groupReadCursorsByMessage,
} from "@/lib/chat/read-cursors-client";
import type {
  ChatMessage,
  ChatPollSummary,
  ChatReadCursor,
} from "@/lib/chat/types";

type ChatMessageThreadItemsProps = {
  messages: ChatMessage[];
  readCursors?: ChatReadCursor[];
  renderTheirAvatar?: (msg: ChatMessage) => ReactNode;
  showSenderNames?: boolean;
  actionHandlers?: ChatMessageActionHandlers;
  editingMessageId?: string | null;
  editingDraft?: string;
  onEditingDraftChange?: (value: string) => void;
  onSaveEdit?: (msg: ChatMessage) => void;
  onCancelEdit?: () => void;
  roomId?: string;
  viewerUserId?: string | null;
  onPollUpdated?: (messageId: string, poll: ChatPollSummary) => void;
  onJumpToMessage?: (messageId: string) => void;
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

function ChatSeenAvatars({
  cursors,
  align,
}: {
  cursors: ChatReadCursor[];
  align: "me" | "them";
}) {
  if (cursors.length === 0) return null;
  const shown = cursors.slice(0, CHAT_SEEN_AVATARS_MAX);
  const extra = cursors.length - shown.length;
  const names = cursors.map((c) => c.name).join(", ");

  return (
    <div
      className={`cins-chat-seen-row is-${align}`}
      aria-label={`Đã xem bởi ${names}`}
      title={names}
    >
      <span className="cins-chat-seen-avatars">
        {shown.map((cursor) => {
          const face = (
            <span
              className={`cins-chat-seen-avatar${cursor.avatarUrl ? " has-image" : ""}`}
              style={
                cursor.avatarUrl
                  ? undefined
                  : { background: avatarBg(cursor.hue) }
              }
              aria-hidden
            >
              {cursor.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cursor.avatarUrl} alt="" />
              ) : (
                cursor.initial
              )}
            </span>
          );

          const slot = cursor.slug ? (
            <JourneyUserPopover
              slug={cursor.slug}
              fallbackName={cursor.name}
              fallbackAvatarUrl={cursor.avatarUrl}
              backdropZIndex={13000}
            >
              {face}
            </JourneyUserPopover>
          ) : (
            face
          );

          return (
            <span key={cursor.userId} className="cins-chat-seen-slot">
              {slot}
            </span>
          );
        })}
        {extra > 0 ? (
          <span className="cins-chat-seen-more" aria-hidden>
            +{extra}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function SeenUnderMessage({
  messageId,
  from,
  byMessage,
}: {
  messageId: string;
  from: "me" | "them";
  byMessage: Map<string, ChatReadCursor[]>;
}) {
  const cursors = byMessage.get(messageId);
  if (!cursors?.length) return null;
  return <ChatSeenAvatars cursors={cursors} align={from} />;
}

function SenderCluster({
  msg,
  renderTheirAvatar,
  showSenderNames,
  showTime = false,
}: {
  msg: ChatMessage;
  renderTheirAvatar?: (msg: ChatMessage) => ReactNode;
  showSenderNames?: boolean;
  showTime?: boolean;
}) {
  const avatar = renderTheirAvatar?.(msg) ?? null;
  const name =
    showSenderNames && msg.senderName ? (
      <span className="cins-chat-sender-name">{msg.senderName}</span>
    ) : null;
  const time =
    showTime ? (
      <span className="cins-chat-sender-time">
        {msg.edited ? <span className="cins-chat-edited">đã sửa</span> : null}
        <time dateTime={msg.sentAt}>{formatChatTime(msg.sentAt)}</time>
      </span>
    ) : null;

  if (!avatar && !name && !time) return null;

  const identity = (
    <div className="cins-chat-sender-identity">
      {avatar}
      {name || time ? (
        <span className="cins-chat-sender-text">
          {name}
          {time}
        </span>
      ) : null}
    </div>
  );

  const slug = msg.senderSlug?.trim();
  if (!slug) {
    return <div className="cins-chat-sender-cluster">{identity}</div>;
  }

  return (
    <div className="cins-chat-sender-cluster">
      <JourneyUserPopover
        slug={slug}
        fallbackName={msg.senderName}
        fallbackAvatarUrl={msg.senderAvatarUrl}
        backdropZIndex={13000}
      >
        {identity}
      </JourneyUserPopover>
    </div>
  );
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
  seenBy,
  renderTheirAvatar,
  showSenderNames,
  actionHandlers,
  editingMessageId,
  editingDraft,
  onEditingDraftChange,
  onSaveEdit,
  onCancelEdit,
  roomId,
  viewerUserId,
  onPollUpdated,
  onJumpToMessage,
}: {
  msg: ChatMessage;
  seenBy?: ChatReadCursor[];
  renderTheirAvatar?: (msg: ChatMessage) => ReactNode;
  showSenderNames?: boolean;
  actionHandlers?: ChatMessageActionHandlers;
  editingMessageId?: string | null;
  editingDraft?: string;
  onEditingDraftChange?: (value: string) => void;
  onSaveEdit?: (msg: ChatMessage) => void;
  onCancelEdit?: () => void;
  roomId?: string;
  viewerUserId?: string | null;
  onPollUpdated?: (messageId: string, poll: ChatPollSummary) => void;
  onJumpToMessage?: (messageId: string) => void;
}) {
  const isMe = msg.from === "me";
  const isEditing = editingMessageId === msg.id;
  const layout = chatMessageMediaLayout(msg);
  const actionsInBubble = chatMessageHasInteractiveMedia(msg) && !isEditing;
  const caption = layout === "media-caption" ? msg.body.trim() : "";

  if (msg.deleted) {
    const useCluster = !isMe && Boolean(showSenderNames);
    return (
      <>
        <div
          id={messageRowId(msg.id)}
          className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${msg.pinned ? " is-pinned-row" : ""}${useCluster ? " has-sender-cluster" : ""}`}
        >
          {useCluster ? (
            <div className="cins-chat-msg-stack">
              <SenderCluster
                msg={msg}
                renderTheirAvatar={renderTheirAvatar}
                showSenderNames={showSenderNames}
                showTime
              />
              <div className={`cins-chat-bubble is-recalled${isMe ? " is-me" : " is-them"}`}>
                <p className="cins-chat-recalled">{recalledLabel(msg)}</p>
              </div>
            </div>
          ) : (
            <>
              {msg.from === "them" ? renderTheirAvatar?.(msg) : null}
              <div className={`cins-chat-bubble is-recalled${isMe ? " is-me" : " is-them"}`}>
                <p className="cins-chat-recalled">{recalledLabel(msg)}</p>
                <BubbleMeta msg={msg} />
              </div>
            </>
          )}
        </div>
        {seenBy?.length ? (
          <ChatSeenAvatars cursors={seenBy} align={isMe ? "me" : "them"} />
        ) : null}
      </>
    );
  }

  if (msg.kind === "moc_nhac" || msg.mocNhac) {
    return (
      <div
        id={messageRowId(msg.id)}
        className="cins-chat-bubble-row is-moc-notice"
      >
        <div className="cins-chat-bubble is-moc-notice">
          <ChatMessageBody
            msg={msg}
            roomId={roomId}
            viewerUserId={viewerUserId}
            onPollUpdated={onPollUpdated}
          />
        </div>
      </div>
    );
  }

  const useSenderCluster = !isMe && Boolean(showSenderNames);

  const rowClass = [
    "cins-chat-bubble-row",
    isMe ? "is-me" : "is-them",
    msg.pinned ? "is-pinned-row" : "",
    layout === "media-only" ? "is-media-row" : "",
    layout === "sticker" ? "is-sticker-row" : "",
    useSenderCluster ? "has-sender-cluster" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const metaBelowMedia =
    !isEditing &&
    !useSenderCluster &&
    (layout === "media-only" || layout === "sticker") ? (
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
        <ChatMessageBody
          msg={msg}
          mediaOnly
          roomId={roomId}
          viewerUserId={viewerUserId}
          onPollUpdated={onPollUpdated}
        />
      </div>
      <div className="cins-chat-media-caption">
        <p>
          <ChatMentionText
            text={caption}
            mentions={msg.mentions}
            viewerUserId={viewerUserId}
            tone={isMe ? "me" : "them"}
          />
        </p>
        {!useSenderCluster ? <BubbleMeta msg={msg} /> : null}
      </div>
    </>
  ) : layout === "media-only" || layout === "sticker" ? (
    <div className="cins-chat-media-block">
      <ChatMessageBody
        msg={msg}
        roomId={roomId}
        viewerUserId={viewerUserId}
        onPollUpdated={onPollUpdated}
      />
      {metaBelowMedia}
    </div>
  ) : (
    <>
      <ChatMessageBody
        msg={msg}
        roomId={roomId}
        viewerUserId={viewerUserId}
        onPollUpdated={onPollUpdated}
      />
      {!isEditing && !useSenderCluster ? <BubbleMeta msg={msg} /> : null}
    </>
  );

  const bubbleBlock = (
    <div className="cins-chat-bubble-wrap">
      <div className={bubbleClassName(msg, isMe, isEditing)}>
        {msg.pinned && !isEditing ? <PinBadge /> : null}
        {msg.replyTo ? (
          <ChatMessageReplyQuote
            reply={msg.replyTo}
            onJump={
              onJumpToMessage
                ? () => onJumpToMessage(msg.replyTo!.id)
                : undefined
            }
          />
        ) : null}
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
  );

  return (
    <>
      <div id={messageRowId(msg.id)} className={rowClass}>
        {useSenderCluster ? (
          <div className="cins-chat-msg-stack">
            <SenderCluster
              msg={msg}
              renderTheirAvatar={renderTheirAvatar}
              showSenderNames={showSenderNames}
              showTime
            />
            {bubbleBlock}
          </div>
        ) : (
          <>
            {msg.from === "them" ? renderTheirAvatar?.(msg) : null}
            {bubbleBlock}
          </>
        )}
      </div>
      {seenBy?.length ? (
        <ChatSeenAvatars cursors={seenBy} align={isMe ? "me" : "them"} />
      ) : null}
    </>
  );
}

export function ChatMessageThreadItems({
  messages,
  readCursors = [],
  renderTheirAvatar,
  showSenderNames = false,
  actionHandlers,
  editingMessageId,
  editingDraft,
  onEditingDraftChange,
  onSaveEdit,
  onCancelEdit,
  roomId,
  viewerUserId,
  onPollUpdated,
  onJumpToMessage,
}: ChatMessageThreadItemsProps) {
  const items = useMemo(() => groupChatMessages(messages), [messages]);
  const byMessage = useMemo(
    () => groupReadCursorsByMessage(readCursors),
    [readCursors],
  );

  return (
    <>
      {items.map((item) => {
        if (item.type === "single") {
          const msg = item.message;
          return (
            <SingleMessageBubble
              key={msg.id}
              msg={msg}
              seenBy={byMessage.get(msg.id)}
              renderTheirAvatar={renderTheirAvatar}
              showSenderNames={showSenderNames}
              actionHandlers={actionHandlers}
              editingMessageId={editingMessageId}
              editingDraft={editingDraft}
              onEditingDraftChange={onEditingDraftChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              roomId={roomId}
              viewerUserId={viewerUserId}
              onPollUpdated={onPollUpdated}
              onJumpToMessage={onJumpToMessage}
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
              seenBy={byMessage.get(msg.id)}
              renderTheirAvatar={renderTheirAvatar}
              showSenderNames={showSenderNames}
              actionHandlers={actionHandlers}
              roomId={roomId}
              viewerUserId={viewerUserId}
              onPollUpdated={onPollUpdated}
              onJumpToMessage={onJumpToMessage}
            />
          );
        }

        const captionMsg = item.messages.find((m) => m.body.trim() && !m.deleted);
        const caption = captionMsg?.body.trim() ?? "";
        const captionAt = captionMsg?.sentAt ?? item.sentAt;
        const albumActionMsg = captionMsg ?? activeMessages[0];
        const useSenderCluster = !isMe && Boolean(showSenderNames);
        const headMsg = captionMsg ?? albumActionMsg ?? item.messages[0];
        const albumSeenIds = item.messages.map((m) => m.id);

        return (
          <Fragment key={`album-${firstId}`}>
            {caption ? (
              <div
                id={captionMsg ? messageRowId(captionMsg.id) : undefined}
                className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${captionMsg?.pinned ? " is-pinned-row" : ""}${useSenderCluster ? " has-sender-cluster" : ""}`}
              >
                {useSenderCluster ? (
                  <div className="cins-chat-msg-stack">
                    <SenderCluster
                      msg={headMsg}
                      renderTheirAvatar={renderTheirAvatar}
                      showSenderNames={showSenderNames}
                      showTime
                    />
                    <div className="cins-chat-bubble-wrap">
                      <div
                        className={`cins-chat-bubble${isMe ? " is-me" : " is-them"} has-media-actions${captionMsg?.pinned ? " is-pinned" : ""}`}
                      >
                        {captionMsg?.pinned ? <PinBadge /> : null}
                        <p>
                          <ChatMentionText
                            text={caption}
                            mentions={captionMsg?.mentions}
                            viewerUserId={viewerUserId}
                            tone={isMe ? "me" : "them"}
                          />
                        </p>
                        {actionHandlers && albumActionMsg ? (
                          <ChatMessageActions
                            msg={albumActionMsg}
                            handlers={actionHandlers}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {item.from === "them"
                      ? renderTheirAvatar?.(captionMsg ?? item.messages[0])
                      : null}
                    <div className="cins-chat-bubble-wrap">
                      <div
                        className={`cins-chat-bubble${isMe ? " is-me" : " is-them"} has-media-actions${captionMsg?.pinned ? " is-pinned" : ""}`}
                      >
                        {captionMsg?.pinned ? <PinBadge /> : null}
                        <p>
                          <ChatMentionText
                            text={caption}
                            mentions={captionMsg?.mentions}
                            viewerUserId={viewerUserId}
                            tone={isMe ? "me" : "them"}
                          />
                        </p>
                        <BubbleMeta msg={captionMsg ?? item.messages[0]} />
                        {actionHandlers && albumActionMsg ? (
                          <ChatMessageActions
                            msg={albumActionMsg}
                            handlers={actionHandlers}
                          />
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}
            {captionMsg ? (
              <SeenUnderMessage
                messageId={captionMsg.id}
                from={item.from}
                byMessage={byMessage}
              />
            ) : null}
            <div
              id={
                !caption && albumActionMsg
                  ? messageRowId(albumActionMsg.id)
                  : undefined
              }
              className={`cins-chat-bubble-row is-media-row ${isMe ? "is-me" : "is-them"}${!isMe && caption ? " is-album-follow" : ""}${!caption && albumActionMsg?.pinned ? " is-pinned-row" : ""}${useSenderCluster && !caption ? " has-sender-cluster" : ""}`}
            >
              {useSenderCluster && !caption ? (
                <div className="cins-chat-msg-stack">
                  <SenderCluster
                    msg={albumActionMsg ?? item.messages[0]}
                    renderTheirAvatar={renderTheirAvatar}
                    showSenderNames={showSenderNames}
                    showTime
                  />
                  <div className="cins-chat-bubble-wrap">
                    <div
                      className={`cins-chat-bubble has-album has-media-actions${isMe ? " is-me" : " is-them"}${!caption && albumActionMsg?.pinned ? " is-pinned" : ""}`}
                    >
                      {!caption && albumActionMsg?.pinned ? <PinBadge /> : null}
                      <div className="cins-chat-media-block">
                        <ChatMessageAlbum messages={activeMessages} />
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
              ) : (
                <>
                  {item.from === "them" && !caption
                    ? renderTheirAvatar?.(albumActionMsg ?? item.messages[0])
                    : null}
                  <div className="cins-chat-bubble-wrap">
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
                        ) : !useSenderCluster ? (
                          <time
                            className="cins-chat-media-meta"
                            dateTime={item.sentAt}
                          >
                            {formatChatTime(captionAt)}
                          </time>
                        ) : null}
                      </div>
                      {!caption && actionHandlers && albumActionMsg ? (
                        <ChatMessageActions
                          msg={albumActionMsg}
                          handlers={actionHandlers}
                        />
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
            {albumSeenIds
              .filter((id) => id !== captionMsg?.id)
              .map((id) => (
                <SeenUnderMessage
                  key={`seen-${id}`}
                  messageId={id}
                  from={item.from}
                  byMessage={byMessage}
                />
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
