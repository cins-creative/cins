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
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import type { ChatMessageActionHandlers } from "@/components/cins/ChatMessageActions";
import { CHAT_REACTION_EMOJIS } from "@/lib/chat/constants";
import { canForwardMessage } from "@/lib/chat/forward-message-client";
import {
  canEditMessage,
  canRecallMessage,
} from "@/lib/chat/message-action-capabilities";
import { isOptimisticMessageId } from "@/lib/chat/optimistic-message";
import type { ChatMessage } from "@/lib/chat/types";

type Mode = "react" | "sheet" | null;

type Props = {
  msg: ChatMessage;
  handlers: ChatMessageActionHandlers;
  mode: Mode;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

function placeReactBar(
  anchor: HTMLElement,
  panel: HTMLElement,
) {
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
  if (left + mw > vLeft + vw - pad) left = Math.max(vLeft + pad, vLeft + vw - pad - mw);
  if (top < vTop + pad) top = rect.bottom + 10;
  if (top + mh > vTop + vh - pad) top = Math.max(vTop + pad, vTop + vh - pad - mh);

  panel.style.position = "fixed";
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.zIndex = "13060";
}

export function ChatMessageMobileChrome({
  msg,
  handlers,
  mode,
  anchorRef,
  onClose,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const reactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mode) setMoreOpen(false);
  }, [mode]);

  useLayoutEffect(() => {
    if (mode !== "react") return;
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
  }, [anchorRef, mode, msg.id]);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, onClose]);

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

  if (!portalReady || !mode || msg.deleted) return null;

  const editable = canEditMessage(msg);
  const recallable = canRecallMessage(msg);
  const forwardable = canForwardMessage(msg) && Boolean(handlers.onForward);
  const isText = msg.kind !== "media" && !msg.imageId;
  const canAddToCanvas =
    Boolean(handlers.onAddToCanvas) &&
    !isOptimisticMessageId(msg.id) &&
    msg.kind !== "sticker" &&
    msg.kind !== "moc_nhac" &&
    msg.kind !== "canvas_binh_luan" &&
    (Boolean(msg.body.trim()) || Boolean(msg.imageUrl) || Boolean(msg.albumImages?.length));

  if (mode === "react") {
    return createPortal(
      <>
        <button
          type="button"
          className="cins-chat-msg-mobile-scrim"
          aria-label="Đóng"
          onClick={onClose}
        />
        <div
          ref={reactRef}
          className="cins-chat-msg-react-picker is-floating is-mobile-tap"
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
                  onClose();
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </>,
      document.body,
    );
  }

  return createPortal(
    <div className="cins-chat-msg-sheet-root" role="presentation">
      <button
        type="button"
        className="cins-chat-msg-mobile-scrim is-sheet"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="cins-chat-msg-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Hành động tin nhắn"
      >
        <div className="cins-chat-msg-sheet-handle" aria-hidden />
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
          <button
            type="button"
            className="cins-chat-msg-sheet-btn"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <Menu size={22} strokeWidth={1.8} aria-hidden />
            <span>Khác</span>
          </button>
        </div>

        {moreOpen ? (
          <div className="cins-chat-msg-sheet-more" role="menu">
            {recallable ? (
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
            {forwardable ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handlers.onForward?.(msg);
                  onClose();
                }}
              >
                <Forward size={16} aria-hidden />
                Chuyển tiếp
              </button>
            ) : null}
            {editable && isText ? (
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
            {canAddToCanvas ? (
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
