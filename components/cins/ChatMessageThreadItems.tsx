"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CornerUpLeft, Forward, Pin } from "lucide-react";

import {
  ChatMessageActions,
  type ChatMessageActionHandlers,
} from "@/components/cins/ChatMessageActions";
import { ChatImageLightbox } from "@/components/cins/ChatImageLightbox";
import { ChatMessageAlbum } from "@/components/cins/ChatMessageAlbum";
import { ChatMessageBody } from "@/components/cins/ChatMessageBody";
import { ChatMentionText } from "@/components/cins/ChatMentionText";
import { ChatMessageMobileChrome } from "@/components/cins/ChatMessageMobileChrome";
import { ChatMessageReactions } from "@/components/cins/ChatMessageReactions";
import { ChatMessageReplyQuote } from "@/components/cins/ChatMessageReplyQuote";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";
import { avatarBg, formatChatTime } from "@/lib/chat/avatar";
import {
  chatClusterRole,
  chatListItemStampAt,
  isChatClusterHead,
  type ChatClusterRole,
} from "@/lib/chat/bubble-time-cluster";
import {
  chatMessageMediaEntries,
  groupChatMessages,
} from "@/lib/chat/message-albums";
import { hideSupersededMocNotices } from "@/lib/chat/moc-notice-latest";
import {
  chatMessageHasInteractiveMedia,
  chatMessageMediaLayout,
} from "@/lib/chat/message-media-layout";
import { isChatSoloEmojiMessage } from "@/lib/chat/solo-emoji";
import { useT } from "@/lib/i18n/use-t";
import {
  CHAT_SWIPE_MIN_DX,
  classifyChatSwipe,
  isChatSwipeMobile,
} from "@/lib/chat/use-chat-convo-swipe";
import {
  CHAT_SEEN_AVATARS_MAX,
  groupReadCursorsByMessage,
  snapReadCursorsToVisibleMessages,
} from "@/lib/chat/read-cursors-client";
import type {
  ChatMessage,
  ChatOrgKind,
  ChatPollSummary,
  ChatReadCursor,
} from "@/lib/chat/types";

const DISMISS_GUARD_MS = 450;
const BUBBLE_LONG_PRESS_MS = 480;

const CHAT_MEDIA_ACTION_SEL = [
  ".cins-chat-msg-image-link",
  ".cins-chat-album-cell",
  ".cins-chat-msg-sticker-btn",
].join(",");

function eventElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isIgnoredActionTarget(
  target: EventTarget | null,
  opts?: { allowMedia?: boolean },
): boolean {
  const el = eventElement(target);
  if (!el) return false;
  if (opts?.allowMedia && el.closest(CHAT_MEDIA_ACTION_SEL)) return false;
  /* Không dùng [role=dialog]/[role=button] — panel chat / bubble host cũng mang role đó. */
  return Boolean(
    el.closest(
      [
        ".cins-chat-msg-actions",
        ".cins-chat-msg-menu",
        ".cins-chat-msg-react-picker",
        ".cins-chat-reaction-actors",
        ".cins-chat-reaction-chip",
        ".cins-chat-reaction-tab",
        ".cins-chat-msg-sheet",
        ".cins-chat-msg-mobile-scrim",
        ".cins-chat-msg-sheet-root",
        "a[href]",
        "input",
        "textarea",
        "select",
        "button",
        "[role='menuitem']",
      ].join(","),
    ),
  );
}

/**
 * Long-press bubble (mobile/touch only) → emoji + bottom sheet.
 * Tap ngắn không mở. Chỉ mở (không toggle đóng) — tránh click đôi / contextmenu+click đóng ngay.
 * Desktop (con trỏ chuột) không có effect này — click chỉ để chọn text/link.
 */
function useBubbleTapActions(
  enabledProp: boolean,
  onSwipeReply?: () => void,
) {
  const isCoarsePointer = useCoarsePointer();
  const enabled = enabledProp && isCoarsePointer;
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const openedAtRef = useRef(0);
  const ignoreClickUntilRef = useRef(0);
  const onSwipeReplyRef = useRef(onSwipeReply);
  onSwipeReplyRef.current = onSwipeReply;

  const closeMobile = useCallback(() => {
    if (Date.now() - openedAtRef.current < DISMISS_GUARD_MS) return;
    setMobileOpen(false);
  }, []);

  const openMobile = useCallback(() => {
    openedAtRef.current = Date.now();
    ignoreClickUntilRef.current = Date.now() + DISMISS_GUARD_MS;
    setMobileOpen(true);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onDoc = (event: PointerEvent) => {
      if (Date.now() - openedAtRef.current < DISMISS_GUARD_MS) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        target instanceof Element &&
        target.closest(
          [
            ".cins-chat-msg-react-picker",
            ".cins-chat-msg-sheet",
            ".cins-chat-msg-mobile-scrim",
            ".cins-chat-msg-sheet-root",
          ].join(","),
        )
      ) {
        return;
      }
      setMobileOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDoc, true);
    }, DISMISS_GUARD_MS);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onDoc, true);
    };
  }, [mobileOpen]);

  const onClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (isIgnoredActionTarget(event.target)) return;
      /* Tap ngắn không mở sheet — long-press / contextmenu mới mở. */
      if (Date.now() < ignoreClickUntilRef.current || mobileOpen) {
        event.stopPropagation();
      }
    },
    [enabled, mobileOpen],
  );

  /* Chặn focus khi tap — tránh scrollIntoView làm bubble/list bị đẩy xổ. */
  const onMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (isIgnoredActionTarget(event.target)) return;
      event.preventDefault();
    },
    [enabled],
  );

  const onContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      event.preventDefault();
      event.stopPropagation();
      if (isIgnoredActionTarget(event.target, { allowMedia: true })) return;
      openMobile();
    },
    [enabled, openMobile],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (mobileOpen) return;
      openMobile();
    },
    [enabled, mobileOpen, openMobile],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !enabled) return;

    const REPLY_PULL = 72;
    const LOCK_PX = 12;
    type Track = {
      x: number;
      y: number;
      axis: "h" | "v" | null;
    };
    let track: Track | null = null;
    let pressTimer: number | null = null;
    let longPressed = false;

    const clearPress = () => {
      if (pressTimer != null) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const resetPull = () => {
      el.classList.remove("is-swipe-reply");
      el.style.removeProperty("--cins-chat-swipe-x");
      el.style.removeProperty("--cins-chat-swipe-p");
    };

    const setPull = (dx: number) => {
      const x = Math.min(Math.max(0, dx), REPLY_PULL);
      el.classList.add("is-swipe-reply");
      el.style.setProperty("--cins-chat-swipe-x", `${x}px`);
      el.style.setProperty(
        "--cins-chat-swipe-p",
        String(Math.min(1, x / CHAT_SWIPE_MIN_DX)),
      );
    };

    const onStart = (e: TouchEvent) => {
      longPressed = false;
      clearPress();
      if (e.touches.length !== 1) {
        track = null;
        return;
      }
      if (isIgnoredActionTarget(e.target, { allowMedia: true })) {
        track = null;
        return;
      }
      const t = e.touches[0];
      track = { x: t.clientX, y: t.clientY, axis: null };
      pressTimer = window.setTimeout(() => {
        pressTimer = null;
        longPressed = true;
        resetPull();
        ignoreClickUntilRef.current = Date.now() + DISMISS_GUARD_MS;
        openMobile();
      }, BUBBLE_LONG_PRESS_MS);
    };

    const onMove = (e: TouchEvent) => {
      if (!track || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - track.x;
      const dy = t.clientY - track.y;
      if (!track.axis) {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
        track.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        clearPress();
      }
      if (longPressed) {
        resetPull();
        return;
      }
      if (track.axis === "h" && dx > 0 && onSwipeReplyRef.current) setPull(dx);
      else resetPull();
    };

    const onEnd = (e: TouchEvent) => {
      clearPress();
      if (longPressed) {
        e.preventDefault();
        e.stopPropagation();
        track = null;
        resetPull();
        return;
      }
      if (!track || e.changedTouches.length !== 1) {
        track = null;
        resetPull();
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - track.x;
      const dy = t.clientY - track.y;
      const axis = track.axis;
      track = null;
      resetPull();
      if (!isChatSwipeMobile() || !onSwipeReplyRef.current) return;
      if (axis === "h" && Math.abs(dx) > LOCK_PX) {
        ignoreClickUntilRef.current = Date.now() + DISMISS_GUARD_MS;
      }
      const dir = classifyChatSwipe(dx, dy);
      if (dir === "right") {
        e.stopPropagation();
        onSwipeReplyRef.current();
      }
    };

    const onClickCapture = (e: Event) => {
      if (!longPressed && Date.now() >= ignoreClickUntilRef.current) return;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", resetPull, { passive: true });
    el.addEventListener("click", onClickCapture, true);
    return () => {
      clearPress();
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", resetPull);
      el.removeEventListener("click", onClickCapture, true);
      resetPull();
    };
  }, [enabled, openMobile]);

  return {
    enabled,
    wrapRef,
    mobileOpen: enabled && mobileOpen,
    closeMobile,
    onClick,
    onMouseDown,
    onContextMenu,
    onKeyDown,
  };
}

function ChatBubbleActionsHost({
  className,
  enabled: enabledProp,
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
  const onSwipeReply = useCallback(() => {
    if (msg && handlers) handlers.onReply(msg);
  }, [handlers, msg]);

  const {
    enabled,
    wrapRef,
    mobileOpen,
    closeMobile,
    onClick,
    onMouseDown,
    onContextMenu,
    onKeyDown,
  } = useBubbleTapActions(
    enabledProp,
    msg && handlers ? onSwipeReply : undefined,
  );

  return (
    <div
      ref={wrapRef}
      className={`${className ?? ""}${enabled ? " has-bubble-actions" : ""}${mobileOpen ? " is-touch-actions is-actions-open" : ""}`.trim()}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      onKeyDown={enabled ? onKeyDown : undefined}
    >
      {msg && handlers ? (
        <span className="cins-chat-swipe-reply-hint" aria-hidden>
          <CornerUpLeft size={16} strokeWidth={2.2} />
        </span>
      ) : null}
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
  /** Staff có quyền đối soát HP — CTA «Xác nhận đã nhận tiền» trên card học phí. */
  canConfirmHocPhi?: boolean;
  /** Brand CSĐT — fallback cho card học phí cũ. */
  orgBrand?: { ten?: string | null; anh?: string | null } | null;
};

function collectGalleryMessages(
  items: ReturnType<typeof groupChatMessages>,
): ChatMessage[] {
  const flat: ChatMessage[] = [];
  for (const item of items) {
    if (item.type === "single") flat.push(item.message);
    else flat.push(...item.messages);
  }
  return flat;
}

function PinBadge() {
  const t = useT();
  return (
    <span className="cins-chat-pin-badge" aria-label={t("chat.pinnedBadge")}>
      <Pin size={11} strokeWidth={2.2} fill="currentColor" aria-hidden />
    </span>
  );
}

function ForwardedBadge({ msg }: { msg: ChatMessage }) {
  const t = useT();
  if (!msg.forwarded) return null;
  return (
    <span className="cins-chat-forwarded-label">
      <Forward size={11} strokeWidth={2.2} aria-hidden />
      {t("chat.forwarded")}
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
  const t = useT();

  return (
    <div
      className={`cins-chat-seen-row is-${align}`}
      aria-label={t("chat.seenBy", { names })}
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

function OrgReplyHintLabel({ msg }: { msg: ChatMessage }) {
  const hint = msg.orgReplyHint;
  if (!hint?.name) return null;
  return (
    <p className="cins-chat-org-reply-hint">
      Trả lời bởi <strong>{hint.name}</strong>
      {hint.vaiTroLabel ? (
        <>
          {" "}
          · {hint.vaiTroLabel}
        </>
      ) : null}
    </p>
  );
}

function ChatSessionStamp({ sentAt }: { sentAt: string }) {
  return (
    <div className="cins-chat-session-stamp" role="separator">
      <time dateTime={sentAt}>{formatChatTime(sentAt)}</time>
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
  if (!msg.edited) return null;
  return (
    <span className={["cins-chat-bubble-meta", className].filter(Boolean).join(" ")}>
      <span className="cins-chat-edited">đã sửa</span>
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

  if (!isEditing && isChatSoloEmojiMessage(msg)) {
    parts.push("is-solo-emoji");
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
  onOpenImage,
  canConfirmHocPhi = false,
  orgBrand = null,
  showSenderIdentity = true,
  clusterRole = "only",
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
  onOpenImage?: (messageId: string) => void;
  canConfirmHocPhi?: boolean;
  orgBrand?: { ten?: string | null; anh?: string | null } | null;
  showSenderIdentity?: boolean;
  clusterRole?: ChatClusterRole;
}) {
  const isMe = msg.from === "me";
  const isEditing = editingMessageId === msg.id;
  const layout = chatMessageMediaLayout(msg);
  const actionsInBubble = chatMessageHasInteractiveMedia(msg) && !isEditing;
  const caption = layout === "media-caption" ? msg.body.trim() : "";

  /* Thu hồi → ẩn hẳn khỏi dòng chat (reply quote vẫn có thể ghi «đã thu hồi»). */
  if (msg.deleted) return null;

  if (msg.kind === "canvas_binh_luan" || msg.canvasBinhLuan) {
    return null;
  }

  if (msg.kind === "cuoc_goi" || msg.cuocGoi) {
    return (
      <div
        id={messageRowId(msg.id)}
        className={`cins-chat-bubble-row is-cuoc-goi-notice ${isMe ? "is-me" : "is-them"}`}
      >
        <div className="cins-chat-bubble is-cuoc-goi-notice">
          <ChatMessageBody
            msg={msg}
            roomId={roomId}
            viewerUserId={viewerUserId}
            onPollUpdated={onPollUpdated}
            canConfirmHocPhi={canConfirmHocPhi}
            orgBrand={orgBrand}
          />
        </div>
      </div>
    );
  }

  if (msg.kind === "shop_don_khao_sat" || msg.shopDonKhaoSat) {
    return (
      <div
        id={messageRowId(msg.id)}
        className="cins-chat-bubble-row is-shop-khao-sat"
      >
        <div className="cins-chat-bubble is-shop-khao-sat">
          <ChatMessageBody
            msg={msg}
            roomId={roomId}
            viewerUserId={viewerUserId}
            onPollUpdated={onPollUpdated}
            canConfirmHocPhi={canConfirmHocPhi}
            orgBrand={orgBrand}
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
            canConfirmHocPhi={canConfirmHocPhi}
            orgBrand={orgBrand}
          />
        </div>
      </div>
    );
  }

  if (msg.kind === "chao_lop" || msg.chaoLop) {
    return (
      <div
        id={messageRowId(msg.id)}
        className="cins-chat-bubble-row is-chao-lop"
      >
        <div className="cins-chat-bubble is-chao-lop">
          <ChatMessageBody
            msg={msg}
            roomId={roomId}
            viewerUserId={viewerUserId}
            onPollUpdated={onPollUpdated}
            canConfirmHocPhi={canConfirmHocPhi}
            orgBrand={orgBrand}
          />
        </div>
      </div>
    );
  }

  if (msg.kind === "phong_lop" || msg.phongLop) {
    return (
      <div
        id={messageRowId(msg.id)}
        className="cins-chat-bubble-row is-phong-lop-invite"
      >
        <div className="cins-chat-bubble is-phong-lop-invite">
          <ChatMessageBody
            msg={msg}
            roomId={roomId}
            viewerUserId={viewerUserId}
            onPollUpdated={onPollUpdated}
            canConfirmHocPhi={canConfirmHocPhi}
            orgBrand={orgBrand}
          />
        </div>
      </div>
    );
  }

  const useSenderCluster = !isMe && Boolean(showSenderNames);
  const showIdentity = showSenderIdentity && !isMe;
  const isDonHangCard =
    !isEditing &&
    (msg.nguCanh?.loai === "don_hang" || msg.nguCanh?.loai === "don_hoc_phi") &&
    !msg.deleted;
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
    useSenderCluster && !showIdentity ? "is-sender-follow" : "",
    `is-cluster-${clusterRole}`,
  ]
    .filter(Boolean)
    .join(" ");

  const timeBelow = !isEditing ? (
    <BubbleMeta msg={msg} className="cins-chat-media-meta" />
  ) : null;

  const metaBelowMedia =
    !isEditing && (layout === "media-only" || layout === "sticker")
      ? timeBelow
      : null;

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
          onOpenImage={onOpenImage}
          canConfirmHocPhi={canConfirmHocPhi}
          orgBrand={orgBrand}
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
      </div>
    </>
  ) : layout === "media-only" || layout === "sticker" ? (
    <div className="cins-chat-media-block">
      <ChatMessageBody
        msg={msg}
        roomId={roomId}
        viewerUserId={viewerUserId}
        onPollUpdated={onPollUpdated}
        onOpenImage={onOpenImage}
        canConfirmHocPhi={canConfirmHocPhi}
        orgBrand={orgBrand}
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
        onOpenImage={onOpenImage}
        canConfirmHocPhi={canConfirmHocPhi}
        orgBrand={orgBrand}
      />
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
      <div className="cins-chat-bubble-main">
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
          canConfirmHocPhi={canConfirmHocPhi}
          orgBrand={orgBrand}
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
      {timeBelow}
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
              onOpenImage={onOpenImage}
              canConfirmHocPhi={canConfirmHocPhi}
              orgBrand={orgBrand}
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
      <div className="cins-chat-bubble-main">
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
      {layout === "media-only" || layout === "sticker" ? null : timeBelow}
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
            {showIdentity ? (
              <SenderCluster
                msg={msg}
                renderTheirAvatar={renderTheirAvatar}
                showSenderNames={showSenderNames}
              />
            ) : null}
            {!isMe ? <OrgReplyHintLabel msg={msg} /> : null}
            {bubbleBlock}
          </div>
        ) : (
          <div className="cins-chat-msg-stack">
            {!isMe ? <OrgReplyHintLabel msg={msg} /> : null}
            <div className="cins-chat-msg-inline">
              {msg.from === "them" ? (
                showIdentity ? (
                  renderTheirAvatar?.(msg) ?? null
                ) : (
                  <span className="cins-chat-avatar-spacer" aria-hidden />
                )
              ) : null}
              {bubbleBlock}
            </div>
          </div>
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
  onOpenCanvasComments,
  canConfirmHocPhi = false,
  orgBrand = null,
}: ChatMessageThreadItemsProps) {
  const visibleMessages = useMemo(
    () => hideSupersededMocNotices(messages),
    [messages],
  );
  const items = useMemo(
    () => groupChatMessages(visibleMessages),
    [visibleMessages],
  );
  const byMessage = useMemo(
    () =>
      groupReadCursorsByMessage(
        snapReadCursorsToVisibleMessages(readCursors, visibleMessages),
      ),
    [readCursors, visibleMessages],
  );

  /* Gallery toàn hội thoại — filmstrip lightbox xem nhanh ảnh xung quanh
     (không giới hạn trong 1 tin/1 album), giống Messenger. */
  const galleryEntries = useMemo(
    () => chatMessageMediaEntries(collectGalleryMessages(items)),
    [items],
  );
  const [openImageId, setOpenImageId] = useState<string | null>(null);
  const openImageIndex = openImageId
    ? galleryEntries.findIndex((entry) => entry.id === openImageId)
    : -1;
  const handleOpenImage = useCallback((messageId: string) => {
    setOpenImageId(messageId);
  }, []);

  return (
    <>
      {items.map((item, index) => {
        const clusterHead = isChatClusterHead(items, index);
        const clusterRole = chatClusterRole(items, index);
        const sessionStamp = clusterHead ? (
          <ChatSessionStamp sentAt={chatListItemStampAt(item)} />
        ) : null;
        if (item.type === "single") {
          const msg = item.message;
          return (
            <Fragment key={msg.id}>
              {sessionStamp}
              <SingleMessageBubble
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
                onOpenImage={handleOpenImage}
                canConfirmHocPhi={canConfirmHocPhi}
                orgBrand={orgBrand}
                showSenderIdentity={clusterHead}
                clusterRole={clusterRole}
              />
            </Fragment>
          );
        }

        const firstId = item.messages[0].id;
        const isMe = item.from === "me";
        const activeMessages = item.messages.filter((m) => !m.deleted);
        if (activeMessages.length === 0) return null;

        const captionMsg = item.messages.find((m) => m.body.trim() && !m.deleted);
        const caption = captionMsg?.body.trim() ?? "";
        const albumActionMsg = captionMsg ?? activeMessages[0];
        const useSenderCluster = !isMe && Boolean(showSenderNames);
        const showAlbumIdentity = clusterHead && !isMe;
        const headMsg = captionMsg ?? albumActionMsg ?? item.messages[0];
        const albumSeenIds = item.messages.map((m) => m.id);
        const albumTime = (
          <BubbleMeta
            msg={albumActionMsg ?? item.messages[0]}
            className="cins-chat-media-meta"
          />
        );

        return (
          <Fragment key={`album-${firstId}`}>
            {sessionStamp}
            {caption ? (
              <div
                id={captionMsg ? messageRowId(captionMsg.id) : undefined}
                className={`cins-chat-bubble-row ${isMe ? "is-me" : "is-them"}${captionMsg?.pinned ? " is-pinned-row" : ""}${useSenderCluster ? " has-sender-cluster" : ""}${useSenderCluster && !showAlbumIdentity ? " is-sender-follow" : ""} is-cluster-${clusterRole}`}
              >
                {useSenderCluster ? (
                  <div className="cins-chat-msg-stack">
                    {showAlbumIdentity ? (
                      <SenderCluster
                        msg={headMsg}
                        renderTheirAvatar={renderTheirAvatar}
                        showSenderNames={showSenderNames}
                      />
                    ) : null}
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
                    {item.from === "them" ? (
                      showAlbumIdentity ? (
                        renderTheirAvatar?.(captionMsg ?? item.messages[0]) ??
                        null
                      ) : (
                        <span className="cins-chat-avatar-spacer" aria-hidden />
                      )
                    ) : null}
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
              className={`cins-chat-bubble-row is-media-row is-bare-media-row ${isMe ? "is-me" : "is-them"}${!isMe && caption ? " is-album-follow" : ""}${!caption && albumActionMsg?.pinned ? " is-pinned-row" : ""}${useSenderCluster && !caption ? " has-sender-cluster" : ""}${useSenderCluster && !caption && !showAlbumIdentity ? " is-sender-follow" : ""} is-cluster-${clusterRole}`}
            >
              {useSenderCluster && !caption ? (
                <div className="cins-chat-msg-stack">
                  {showAlbumIdentity ? (
                    <SenderCluster
                      msg={albumActionMsg ?? item.messages[0]}
                      renderTheirAvatar={renderTheirAvatar}
                      showSenderNames={showSenderNames}
                    />
                  ) : null}
                  <ChatBubbleActionsHost
                    className="cins-chat-bubble-wrap cins-chat-bare-media-wrap has-album"
                    enabled={Boolean(actionHandlers)}
                    msg={albumActionMsg}
                    handlers={actionHandlers}
                  >
                    <div className="cins-chat-bare-media-body">
                      {!caption && albumActionMsg?.pinned ? <PinBadge /> : null}
                      <div className="cins-chat-media-block">
                        <div className="cins-chat-bare-media-frame">
                          <ChatMessageAlbum
                            messages={activeMessages}
                            onOpenImage={handleOpenImage}
                          />
                        </div>
                        {albumTime}
                      </div>
                    </div>
                    {actionHandlers && albumActionMsg ? (
                      <ChatMessageActions
                        msg={albumActionMsg}
                        handlers={actionHandlers}
                      />
                    ) : null}
                  </ChatBubbleActionsHost>
                </div>
              ) : (
                <>
                  {item.from === "them" && !caption ? (
                    showAlbumIdentity ? (
                      renderTheirAvatar?.(
                        albumActionMsg ?? item.messages[0],
                      ) ?? null
                    ) : (
                      <span className="cins-chat-avatar-spacer" aria-hidden />
                    )
                  ) : null}
                  <ChatBubbleActionsHost
                    className="cins-chat-bubble-wrap cins-chat-bare-media-wrap has-album"
                    enabled={Boolean(actionHandlers)}
                    msg={albumActionMsg}
                    handlers={actionHandlers}
                  >
                    <div className="cins-chat-bare-media-body">
                      {!caption && albumActionMsg?.pinned ? <PinBadge /> : null}
                      <div className="cins-chat-media-block">
                        <div className="cins-chat-bare-media-frame">
                          <ChatMessageAlbum
                            messages={activeMessages}
                            onOpenImage={handleOpenImage}
                          />
                        </div>
                        {albumTime}
                      </div>
                    </div>
                    {actionHandlers && albumActionMsg ? (
                      <ChatMessageActions
                        msg={albumActionMsg}
                        handlers={actionHandlers}
                      />
                    ) : null}
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

      {openImageIndex >= 0 ? (
        <ChatImageLightbox
          images={galleryEntries.map((entry) => entry.src)}
          index={openImageIndex}
          onClose={() => setOpenImageId(null)}
          onIndexChange={(nextIndex) =>
            setOpenImageId(galleryEntries[nextIndex]?.id ?? null)
          }
        />
      ) : null}
    </>
  );
}
