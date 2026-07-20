"use client";

import {
  CornerUpLeft,
  Copy,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Pin,
  Smile,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { CHAT_ACTION_WINDOW_MS, CHAT_REACTION_EMOJIS } from "@/lib/chat/constants";
import { isOptimisticMessageId } from "@/lib/chat/optimistic-message";
import type { ChatMessage } from "@/lib/chat/types";

export type ChatMessageActionHandlers = {
  onReply: (msg: ChatMessage) => void;
  onRecall: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onPin: (msg: ChatMessage, pinned: boolean) => void;
  onReaction: (msg: ChatMessage, emoji: string, active: boolean) => void;
  onAddToCanvas?: (msg: ChatMessage) => void;
};

type Props = {
  msg: ChatMessage;
  handlers: ChatMessageActionHandlers;
};

function canModify(msg: ChatMessage): boolean {
  if (msg.from !== "me" || msg.deleted) return false;
  return Date.now() - new Date(msg.sentAt).getTime() <= CHAT_ACTION_WINDOW_MS;
}

/** Neo popup fixed trong visualViewport — tránh bị overflow chat cắt trên mobile. */
function useFloatingPanel(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  align: "start" | "end" = "end",
) {
  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const mw = panel.offsetWidth;
    const mh = panel.offsetHeight;
    const pad = 8;
    const vv = window.visualViewport;
    const vw = vv?.width ?? window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const vTop = vv?.offsetTop ?? 0;
    const vLeft = vv?.offsetLeft ?? 0;

    let top = rect.bottom + 6;
    let left = align === "end" ? rect.right - mw : rect.left;

    if (left < vLeft + pad) left = vLeft + pad;
    if (left + mw > vLeft + vw - pad) left = Math.max(vLeft + pad, vLeft + vw - pad - mw);

    if (top + mh > vTop + vh - pad) {
      top = rect.top - mh - 6;
    }
    if (top < vTop + pad) top = vTop + pad;

    panel.style.position = "fixed";
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    panel.style.zIndex = "12050";
  }, [align, anchorRef, panelRef]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const id = window.requestAnimationFrame(place);
    const vv = window.visualViewport;
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    vv?.addEventListener("resize", place);
    vv?.addEventListener("scroll", place);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
      vv?.removeEventListener("resize", place);
      vv?.removeEventListener("scroll", place);
    };
  }, [open, place]);
}

export function ChatMessageActions({ msg, handlers }: Props) {
  const [open, setOpen] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reactBtnRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const reactPanelRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open && !showReact) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (reactPanelRef.current?.contains(t)) return;
      if (menuPanelRef.current?.contains(t)) return;
      setOpen(false);
      setShowReact(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open, showReact]);

  useFloatingPanel(showReact, reactBtnRef, reactPanelRef, "end");
  useFloatingPanel(open, menuBtnRef, menuPanelRef, "end");

  if (msg.deleted) return null;

  const modifiable = canModify(msg);
  const isText = msg.kind !== "media" && !msg.imageId;
  const canAddToCanvas =
    Boolean(handlers.onAddToCanvas) &&
    !isOptimisticMessageId(msg.id) &&
    msg.kind !== "sticker" &&
    msg.kind !== "moc_nhac" &&
    msg.kind !== "canvas_binh_luan" &&
    (Boolean(msg.body.trim()) || Boolean(msg.imageUrl) || Boolean(msg.albumImages?.length));

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

  const reactPicker =
    showReact && portalReady
      ? createPortal(
          <div
            ref={reactPanelRef}
            className="cins-chat-msg-react-picker is-floating"
            role="menu"
          >
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
          </div>,
          document.body,
        )
      : null;

  const actionMenu =
    open && portalReady
      ? createPortal(
          <div
            ref={menuPanelRef}
            className="cins-chat-msg-menu is-floating"
            role="menu"
          >
            <button type="button" role="menuitem" onClick={() => void copyText()}>
              <Copy size={14} aria-hidden />
              Sao chép
            </button>
            {modifiable && isText ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handlers.onEdit(msg);
                  setOpen(false);
                }}
              >
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
            {canAddToCanvas ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handlers.onAddToCanvas?.(msg);
                  setOpen(false);
                }}
              >
                <LayoutGrid size={14} aria-hidden />
                Thêm vào canvas
              </button>
            ) : null}
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={
        "cins-chat-msg-actions" +
        (open || showReact ? " is-open" : "")
      }
      ref={rootRef}
    >
      <button
        type="button"
        className="cins-chat-msg-action-btn"
        aria-label="Trả lời"
        title="Trả lời"
        onClick={() => {
          handlers.onReply(msg);
          setOpen(false);
          setShowReact(false);
        }}
      >
        <CornerUpLeft size={14} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        ref={reactBtnRef}
        type="button"
        className="cins-chat-msg-action-btn"
        aria-label="Thả reaction"
        aria-expanded={showReact}
        onClick={() => {
          setShowReact((v) => !v);
          setOpen(false);
        }}
      >
        <Smile size={14} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        ref={menuBtnRef}
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

      {reactPicker}
      {actionMenu}
    </div>
  );
}
