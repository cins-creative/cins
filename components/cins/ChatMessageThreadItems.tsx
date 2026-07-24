"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Forward, Pin } from "lucide-react";

import {
  ChatMessageActions,
  type ChatMessageActionHandlers,
} from "@/components/cins/ChatMessageActions";
import { ChatMessageAlbum } from "@/components/cins/ChatMessageAlbum";
import { ChatMessageBody } from "@/components/cins/ChatMessageBody";
import { ChatMentionText } from "@/components/cins/ChatMentionText";
import { ChatMessageMobileChrome } from "@/components/cins/ChatMessageMobileChrome";
import { ChatMessageReactions } from "@/components/cins/ChatMessageReactions";
import { ChatMessageReplyQuote } from "@/components/cins/ChatMessageReplyQuote";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
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
  snapReadCursorsToOwnMessages,
} from "@/lib/chat/read-cursors-client";
import type {
  ChatMessage,
  ChatOrgKind,
  ChatPollSummary,
  ChatReadCursor,
} from "@/lib/chat/types";

const MOBILE_MOVE_CANCEL_PX = 14;
/** Chặn scrim/doc đóng ngay sau gesture mở (synthetic click). */
const MOBILE_DISMISS_GUARD_MS = 400;

function usePreferTouchChatActions() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return touch;
}

/** Click/tap bubble → emoji + tab chức năng. Desktop vẫn hover hiện 3 nút phụ. */
function useRevealMessageActions(enabled: boolean, touchUi: boolean) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const ignoreClickRef = useRef(false);
  const openedAtRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const closeMobile = useCallback(() => {
    if (Date.now() - openedAtRef.current < MOBILE_DISMISS_GUARD_MS) return;
    setMobileOpen(false);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => {
      if (prev) return false;
      openedAtRef.current = Date.now();
      return true;
    });
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onDoc = (event: PointerEvent) => {
      if (Date.now() - openedAtRef.current < MOBILE_DISMISS_GUARD_MS) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrapRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest(
          [
            ".cins-chat-msg-menu.is-floating",
            ".cins-chat-msg-react-picker.is-floating",
            ".cins-chat-reaction-actors.is-floating",
            ".cins-chat-msg-sheet",
            ".cins-chat-msg-mobile-scrim",
            ".cins-chat-reaction-tab",
          ].join(","),
        )
      ) {
        return;
      }
      setMobileOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDoc);
    }, MOBILE_DISMISS_GUARD_MS);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onDoc);
    };
  }, [mobileOpen]);

  const isInteractiveTarget = useCallback((target: Element) => {
    return Boolean(
      target.closest(
        [
          ".cins-chat-msg-actions",
          ".cins-chat-msg-menu",
          ".cins-chat-msg-react-picker",
          ".cins-chat-reaction-actors",
          ".cins-chat-reaction-chip",
          ".cins-chat-reaction-tab",
          ".cins-chat-msg-sheet",
          "a[href]",
          "input",
          "textarea",
          "select",
          "button",
          "[role='menuitem']",
          "[role='dialog']",
        ].join(","),
      ),
    );
  }, []);

  /* Native touch tap → mở emoji + sheet (tránh chờ synthetic click trên iOS). */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const target = event.target;
      if (!(target instanceof Element) || isInteractiveTarget(target)) {
        touchStartRef.current = null;
        return;
      }
      const t = event.touches[0]!;
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchStartRef.current || event.touches.length === 0) return;
      const t = event.touches[0]!;
      if (
        Math.abs(t.clientX - touchStartRef.current.x) > MOBILE_MOVE_CANCEL_PX ||
        Math.abs(t.clientY - touchStartRef.current.y) > MOBILE_MOVE_CANCEL_PX
      ) {
        touchStartRef.current = null;
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchStartRef.current) return;
      touchStartRef.current = null;
      const target = event.target;
      if (!(target instanceof Element) || isInteractiveTarget(target)) return;
      event.preventDefault();
      ignoreClickRef.current = true;
      toggleMobile();
    };

    const onTouchCancel = () => {
      touchStartRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, isInteractiveTarget, toggleMobile]);

  const onWrapClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (ignoreClickRef.current) {
        ignoreClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (isInteractiveTarget(target)) return;

      /* Click/tap luôn mở emoji + tab — không phụ thuộc media query. */
      toggleMobile();
    },
    [enabled, isInteractiveTarget, toggleMobile],
  );

  return {
    wrapRef,
    onWrapClick,
    /* Desktop hover CSS vẫn hiện 3 nút; class này chỉ khi cần force-visible. */
    actionsVisible: false,
    mobileOpen: enabled && mobileOpen,
    closeMobile,
    touchUi,
  };
}

function ChatBubbleActionsHost({
  className,
  enabled,
  msg,
  handlers,
  children,
}: {
  className?: string;
  enabled: boolean;
  msg?: ChatMessage;
  handlers?: ChatMessageActionHandlers;
  children: ReactNode;
}) {
  const touchUi = usePreferTouchChatActions();
  const {
    wrapRef,
    onWrapClick,
    actionsVisible,
    mobileOpen,
    closeMobile,
    touchUi: touchMode,
  } = useRevealMessageActions(enabled, touchUi);

  return (
    <div
      ref={wrapRef}
      className={`${className ?? ""}${actionsVisible ? " is-actions-visible" : ""}${enabled ? " has-bubble-actions" : ""}${touchMode || mobileOpen ? " is-touch-actions" : ""}`.trim()}
      onClick={onWrapClick}
    >
      {children}
      {msg && handlers && mobileOpen ? (
        <ChatMessageMobileChrome
          msg={msg}
          handlers={handlers}
          open={mobileOpen}
          anchorRef={wrapRef}
          onClose={closeMobile}
        />
      ) : null}
    </div>
  );
}

function orgPopoverKind(
  orgKind: ChatOrgKind | undefined,
): "cong_dong" | "co_so_dao_tao" | "truong" | "studio" | null {
  if (orgKind === "cong_dong") return "cong_dong";
  if (orgKind === "co_so_dao_tao") return "co_so_dao_tao";
  if (orgKind === "truong_dai_hoc") return "truong";
  if (orgKind === "studio") return "studio";
  return null;
}

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
  onOpenCanvasComments?: (nodeIds: string[], messageId: string) => void;
};

function PinBadge() {
  return (
    <span className="cins-chat-pin-badge" aria-label="Tin đã ghim">
      <Pin size={11} strokeWidth={2.2} fill="currentColor" aria-hidden />
    </span>
  );
}

function ForwardedBadge({ msg }: { msg: ChatMessage }) {
  if (!msg.forwarded) return null;
  return (
    <span className="cins-chat-forwarded-label">
      <Forward size={11} strokeWidth={2.2} aria-hidden />
      Đã chuyển tiếp
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

          const slot = (() => {
            if (cursor.asOrg) {
              const popoverKind = orgPopoverKind(cursor.orgKind);
              if (cursor.slug && popoverKind) {
                return (
                  <JourneyOrgPopover
                    slug={cursor.slug}
                    orgKind={popoverKind}
                    fallbackName={cursor.name}
                    fallbackAvatarUrl={cursor.avatarUrl}
                  >
                    {face}
                  </JourneyOrgPopover>
                );
              }
              return face;
            }
            if (cursor.slug) {
              return (
                <JourneyUserPopover
                  slug={cursor.slug}
                  fallbackName={cursor.name}
                  fallbackAvatarUrl={cursor.avatarUrl}
                  backdropZIndex={13000}
                >
                  {face}
                </JourneyUserPopover>
              );
            }
            return face;
          })();

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
  if (from !== "me") return null;
  const cursors = byMessage.get(messageId);
  if (!cursors?.length) return null;
  return <ChatSeenAvatars cursors={cursors} align="me" />;
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
  onOpenCanvasComments,
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
  onOpenCanvasComments?: (nodeIds: string[], messageId: string) => void;
}) {
  const isMe = msg.from === "me";
  const isEditing = editingMessageId === msg.id;
  const layout = chatMessageMediaLayout(msg);
  const actionsInBubble = chatMessageHasInteractiveMedia(msg) && !isEditing;
  const caption = layout === "media-caption" ? msg.body.trim() : "";

  /* Thu hồi → ẩn hẳn khỏi dòng chat (reply quote vẫn có thể ghi «đã thu hồi»). */
  if (msg.deleted) return null;

  if (msg.kind === "canvas_binh_luan" || msg.canvasBinhLuan) {
    if (msg.deleted) return null;
    return (
      <div
        id={messageRowId(msg.id)}
        className="cins-chat-bubble-row is-canvas-comment-notice"
      >
        <div className="cins-chat-bubble is-canvas-comment-notice">
          <ChatMessageBody
            msg={msg}
            roomId={roomId}
            viewerUserId={viewerUserId}
            onPollUpdated={onPollUpdated}
            onOpenCanvasComments={onOpenCanvasComments}
          />
        </div>
      </div>
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
  const isDonHangCard =
    !isEditing && msg.nguCanh?.loai === "don_hang" && !msg.deleted;
  /** Ảnh / sticker đứng riêng — không bọc bubble chat. */
  const isBareMedia =
    !isEditing &&
    !msg.deleted &&
    (layout === "media-only" || layout === "sticker");

  const rowClass = [
    "cins-chat-bubble-row",
    isMe ? "is-me" : "is-them",
    msg.pinned ? "is-pinned-row" : "",
    layout === "media-only" ? "is-media-row" : "",
    layout === "sticker" ? "is-sticker-row" : "",
    isDonHangCard ? "is-don-hang-row" : "",
    isBareMedia ? "is-bare-media-row" : "",
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
      {!isEditing && !useSenderCluster && !isDonHangCard ? (
        <BubbleMeta msg={msg} />
      ) : null}
    </>
  );

  const actionsEnabled = Boolean(actionHandlers) && !isEditing;

  const bubbleBlock = isDonHangCard ? (
    <ChatBubbleActionsHost
      className="cins-chat-bubble-wrap cins-chat-don-hang-wrap"
      enabled={actionsEnabled}
      msg={msg}
      handlers={actionHandlers}
    >
      <div className="cins-chat-don-hang-body">
        {msg.pinned ? <PinBadge /> : null}
        <ForwardedBadge msg={msg} />
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
        <ChatMessageBody
          msg={msg}
          roomId={roomId}
          viewerUserId={viewerUserId}
          onPollUpdated={onPollUpdated}
        />
        {!useSenderCluster ? (
          <BubbleMeta msg={msg} className="cins-chat-don-hang-meta" />
        ) : null}
        {!isEditing && msg.reactions?.length && actionHandlers ? (
          <ChatMessageReactions
            placement="corner"
            reactions={msg.reactions}
            revealActorsOnClick={isMe}
            onToggle={(emoji, active) =>
              actionHandlers.onReaction(msg, emoji, active)
            }
          />
        ) : null}
      </div>
      {actionHandlers ? (
        <ChatMessageActions msg={msg} handlers={actionHandlers} />
      ) : null}
    </ChatBubbleActionsHost>
  ) : isBareMedia ? (
    <ChatBubbleActionsHost
      className="cins-chat-bubble-wrap cins-chat-bare-media-wrap"
      enabled={actionsEnabled}
      msg={msg}
      handlers={actionHandlers}
    >
      <div className="cins-chat-bare-media-body">
        {msg.pinned ? <PinBadge /> : null}
        <ForwardedBadge msg={msg} />
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
        <div className="cins-chat-media-block">
          {/* Frame neo reaction vào ảnh — không gồm dòng thời gian. */}
          <div className="cins-chat-bare-media-frame">
            <ChatMessageBody
              msg={msg}
              roomId={roomId}
              viewerUserId={viewerUserId}
              onPollUpdated={onPollUpdated}
            />
            {!isEditing && msg.reactions?.length && actionHandlers ? (
              <ChatMessageReactions
                placement="corner"
                reactions={msg.reactions}
                revealActorsOnClick={isMe}
                onToggle={(emoji, active) =>
                  actionHandlers.onReaction(msg, emoji, active)
                }
              />
            ) : null}
          </div>
          {metaBelowMedia}
        </div>
      </div>
      {actionHandlers ? (
        <ChatMessageActions msg={msg} handlers={actionHandlers} />
      ) : null}
    </ChatBubbleActionsHost>
  ) : (
    <ChatBubbleActionsHost
      className="cins-chat-bubble-wrap"
      enabled={actionsEnabled}
      msg={msg}
      handlers={actionHandlers}
    >
      <div className={bubbleClassName(msg, isMe, isEditing)}>
        {msg.pinned && !isEditing ? <PinBadge /> : null}
        <ForwardedBadge msg={msg} />
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
            revealActorsOnClick={isMe}
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
    </ChatBubbleActionsHost>
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
      {seenBy?.length && isMe ? (
        <ChatSeenAvatars cursors={seenBy} align="me" />
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
  onOpenCanvasComments,
}: ChatMessageThreadItemsProps) {
  const items = useMemo(() => groupChatMessages(messages), [messages]);
  const byMessage = useMemo(
    () =>
      groupReadCursorsByMessage(
        snapReadCursorsToOwnMessages(readCursors, messages),
      ),
    [readCursors, messages],
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
              onOpenCanvasComments={onOpenCanvasComments}
            />
          );
        }

        const firstId = item.messages[0].id;
        const isMe = item.from === "me";
        const activeMessages = item.messages.filter((m) => !m.deleted);
        if (activeMessages.length === 0) return null;

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
                    <ChatBubbleActionsHost
                      className="cins-chat-bubble-wrap"
                      enabled={Boolean(actionHandlers)}
                      msg={albumActionMsg}
                      handlers={actionHandlers}
                    >
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
                    </ChatBubbleActionsHost>
                  </div>
                ) : (
                  <>
                    {item.from === "them"
                      ? renderTheirAvatar?.(captionMsg ?? item.messages[0])
                      : null}
                    <ChatBubbleActionsHost
                      className="cins-chat-bubble-wrap"
                      enabled={Boolean(actionHandlers)}
                      msg={albumActionMsg}
                      handlers={actionHandlers}
                    >
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
                    </ChatBubbleActionsHost>
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
                  <ChatBubbleActionsHost
                    className="cins-chat-bubble-wrap"
                    enabled={Boolean(actionHandlers) && !caption}
                    msg={albumActionMsg}
                    handlers={actionHandlers}
                  >
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
                  </ChatBubbleActionsHost>
                </div>
              ) : (
                <>
                  {item.from === "them" && !caption
                    ? renderTheirAvatar?.(albumActionMsg ?? item.messages[0])
                    : null}
                  <ChatBubbleActionsHost
                    className="cins-chat-bubble-wrap"
                    enabled={Boolean(actionHandlers) && !caption}
                    msg={albumActionMsg}
                    handlers={actionHandlers}
                  >
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
                  </ChatBubbleActionsHost>
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
