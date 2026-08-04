"use client";

import { MonitorUp, Phone, Video } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { isCompactCallViewport } from "@/lib/media/call-constraints";
import type { MediaCallMode } from "@/lib/media/call-mode";
import { stopWarmCallMedia, warmCallMedia } from "@/lib/media/media-warm";

type Props = {
  disabled?: boolean;
  onSelect: (mode: MediaCallMode) => void;
};

/** Nút gọi + menu chọn audio / video / chia sẻ màn (desktop). */
export function ChatCallModeMenu({ disabled = false, onSelect }: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [allowScreen, setAllowScreen] = useState(() => !isCompactCallViewport());

  useEffect(() => {
    const sync = () => setAllowScreen(!isCompactCallViewport());
    sync();
    const mq = window.matchMedia("(max-width: 1024px)");
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const t = event.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      setOpen(false);
      stopWarmCallMedia();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      stopWarmCallMedia();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (mode: MediaCallMode) => {
    setOpen(false);
    onSelect(mode);
  };

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      /* Chỉ chiếm mic khi user chủ động mở menu; đóng menu thì nhả ngay
         để tai nghe Bluetooth không kẹt ở profile HFP. */
      if (next) void warmCallMedia({ video: false });
      else stopWarmCallMedia();
      return next;
    });
  };

  return (
    <div
      ref={rootRef}
      className={`cins-chat-compose-tools cins-chat-call-menu${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="cins-chat-attach"
        aria-label="Gọi"
        title="Gọi"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        <Phone size={18} strokeWidth={1.9} aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          className="cins-chat-compose-tools-panel cins-chat-call-menu-panel"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="cins-chat-compose-tools-item"
            onClick={() => pick("audio")}
          >
            <Phone size={16} strokeWidth={1.9} aria-hidden />
            <span>
              <strong>Gọi thoại</strong>
              <em>Chỉ mic</em>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="cins-chat-compose-tools-item"
            onPointerEnter={() => {
              void warmCallMedia({ video: true });
            }}
            onClick={() => pick("video")}
          >
            <Video size={16} strokeWidth={1.9} aria-hidden />
            <span>
              <strong>Gọi video</strong>
              <em>Camera + mic</em>
            </span>
          </button>
          {allowScreen ? (
            <button
              type="button"
              role="menuitem"
              className="cins-chat-compose-tools-item"
              onClick={() => pick("screen")}
            >
              <MonitorUp size={16} strokeWidth={1.9} aria-hidden />
              <span>
                <strong>Chia sẻ màn hình</strong>
                <em>Desktop web — chọn cửa sổ / tab</em>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
