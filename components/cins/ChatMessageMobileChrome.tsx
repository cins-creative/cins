"use client";

import {
  Copy,
  CornerUpLeft,
  Forward,
  Frame,
  Menu,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import type { ChatMessageActionHandlers } from "@/components/cins/ChatMessageActions";
import { CHAT_REACTION_EMOJIS } from "@/lib/chat/constants";
import { canForwardMessage } from "@/lib/chat/forward-message-client";
import {
  canAddMessageToCanvas,
  canEditMessage,
  canRecallMessage,
} from "@/lib/chat/message-action-capabilities";
import type { ChatMessage } from "@/lib/chat/types";

type Props = {
  msg: ChatMessage;
  handlers: ChatMessageActionHandlers;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

function placeReactBar(anchor: HTMLElement, panel: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const mw = panel.offsetWidth;
  const mh = panel.offsetHeight;
  const pad = 8;
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const vTop = vv?.offsetTop ?? 0;
  const vLeft = vv?.offsetLeft ?? 0;

  let top = rect.top - mh - 10;
  let left = rect.left + rect.width / 2 - mw / 2;

  if (left < vLeft + pad) left = vLeft + pad;
  if (left + mw > vLeft + vw - pad) {
    left = Math.max(vLeft + pad, vLeft + vw - pad - mw);
  }
  if (top < vTop + pad) top = rect.bottom + 10;
  if (top + mh > vTop + vh - pad) {
    top = Math.max(vTop + pad, vTop + vh - pad - mh);
  }

  panel.style.position = "fixed";
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.zIndex = "3";
}

/** Tap bubble → emoji phía trên + tab chức năng phía dưới. */
export function ChatMessageMobileChrome({
  msg,
  handlers,
  open,
  anchorRef,
  onClose,
}: Props) {
  const [portalReady, setPortalReady] = useState(
    () => typeof document !== "undefined",
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const reactRef = useRef<HTMLDivElement>(null);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    setPortalReady(true);
    mountedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!open) {
      setMoreOpen(false);
      return;
    }
    mountedAtRef.current = Date.now();
  }, [open]);

  const guardedClose = useCallback(() => {
    if (Date.now() - mountedAtRef.current < 400) return;
    onClose();
  }, [onClose]);

  /** Đóng sheet + chặn click xuyên xuống chat (tránh đóng overlay/mini). */
  const dismissScrim = useCallback(
    (event: ReactPointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (Date.now() - mountedAtRef.current < 400) return;
      onClose();
      const blockThrough = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      document.addEventListener("click", blockThrough, true);
      document.addEventListener("pointerup", blockThrough, true);
      window.setTimeout(() => {
        document.removeEventListener("click", blockThrough, true);
        document.removeEventListener("pointerup", blockThrough, true);
      }, 400);
    },
    [onClose],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const panel = reactRef.current;
    if (!anchor || !panel) return;
    const place = () => placeReactBar(anchor, panel);
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
  }, [anchorRef, open, msg.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") guardedClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, guardedClose]);

  const copyText = useCallback(async () => {
    const text = msg.body.trim() || (msg.imageUrl ? msg.imageUrl : "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    onClose();
  }, [msg.body, msg.imageUrl, onClose]);

  const startForward = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      handlers.onForward?.(msg);
      onClose();
    },
    [handlers, msg, onClose],
  );

  if (!portalReady || !open || msg.deleted) return null;

  const editable = canEditMessage(msg);
  const recallable = canRecallMessage(msg);
  const forwardable = canForwardMessage(msg) && Boolean(handlers.onForward);
  const isText = msg.kind !== "media" && !msg.imageId;
  const canAddToCanvas =
    Boolean(handlers.onAddToCanvas) && canAddMessageToCanvas(msg);
  /* Tin chữ (không canvas): đưa «Chuyển tiếp» ra ô Khác trên lưới. */
  const promoteForward = forwardable && !canAddToCanvas;
  const morePin = recallable;
  const moreEdit = editable && isText;
  const moreForward = forwardable && !promoteForward;
  const moreCanvas = canAddToCanvas;
  const hasMoreItems = morePin || moreEdit || moreForward || moreCanvas;
  const showMorePanel = hasMoreItems && (promoteForward || moreOpen);

  return createPortal(
    <div
      className="cins-chat-msg-sheet-root"
      role="presentation"
      style={{ zIndex: 50000 }}
    >
      <button
        type="button"
        className="cins-chat-msg-mobile-scrim is-sheet"
        aria-label="Đóng"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          dismissScrim(event);
        }}
      />
      <div
        ref={reactRef}
        className="cins-chat-msg-react-picker is-floating is-mobile-tap"
        role="menu"
        aria-label="Thả reaction"
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
                onClose();
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
      <div
        className="cins-chat-msg-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Hành động tin nhắn"
      >
        <div className="cins-chat-msg-sheet-grid">
          <button
            type="button"
            className="cins-chat-msg-sheet-btn"
            onClick={() => {
              handlers.onReply(msg);
              onClose();
            }}
          >
            <CornerUpLeft size={22} strokeWidth={1.8} aria-hidden />
            <span>Trả lời</span>
          </button>
          <button
            type="button"
            className="cins-chat-msg-sheet-btn"
            onClick={() => void copyText()}
          >
            <Copy size={22} strokeWidth={1.8} aria-hidden />
            <span>Sao chép</span>
          </button>
          {recallable ? (
            <button
              type="button"
              className="cins-chat-msg-sheet-btn is-danger"
              onClick={() => {
                handlers.onRecall(msg);
                onClose();
              }}
            >
              <Trash2 size={22} strokeWidth={1.8} aria-hidden />
              <span>Thu hồi</span>
            </button>
          ) : (
            <button
              type="button"
              className="cins-chat-msg-sheet-btn"
              onClick={() => {
                handlers.onPin(msg, !msg.pinned);
                onClose();
              }}
            >
              <Pin size={22} strokeWidth={1.8} aria-hidden />
              <span>{msg.pinned ? "Bỏ ghim" : "Ghim"}</span>
            </button>
          )}
          {promoteForward ? (
            <button
              type="button"
              className="cins-chat-msg-sheet-btn"
              onPointerDown={startForward}
            >
              <Forward size={22} strokeWidth={1.8} aria-hidden />
              <span>Chuyển tiếp</span>
            </button>
          ) : hasMoreItems ? (
            <button
              type="button"
              className="cins-chat-msg-sheet-btn"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <Menu size={22} strokeWidth={1.8} aria-hidden />
              <span>Khác</span>
            </button>
          ) : null}
        </div>

        {showMorePanel ? (
          <div className="cins-chat-msg-sheet-more" role="menu">
            {morePin ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handlers.onPin(msg, !msg.pinned);
                  onClose();
                }}
              >
                <Pin size={16} aria-hidden />
                {msg.pinned ? "Bỏ ghim" : "Ghim"}
              </button>
            ) : null}
            {moreForward ? (
              <button
                type="button"
                role="menuitem"
                onPointerDown={startForward}
              >
                <Forward size={16} aria-hidden />
                Chuyển tiếp
              </button>
            ) : null}
            {moreEdit ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handlers.onEdit(msg);
                  onClose();
                }}
              >
                <Pencil size={16} aria-hidden />
                Sửa
              </button>
            ) : null}
            {moreCanvas ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handlers.onAddToCanvas?.(msg);
                  onClose();
                }}
              >
                <Frame size={16} aria-hidden />
                Thêm vào canvas
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
