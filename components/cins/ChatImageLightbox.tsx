"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ChatImageLightboxProps = {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ChatImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: ChatImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const total = images.length;
  const current = images[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (total <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange((index - 1 + total) % total);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange((index + 1) % total);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, onClose, onIndexChange, total]);

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="cins-chat-lightbox"
      aria-label="Xem ảnh"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="cins-chat-lightbox-inner">
        <button
          type="button"
          className="cins-chat-lightbox-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={22} strokeWidth={2} aria-hidden />
        </button>

        {total > 1 ? (
          <>
            <button
              type="button"
              className="cins-chat-lightbox-nav cins-chat-lightbox-nav--prev"
              aria-label="Ảnh trước"
              onClick={goPrev}
            >
              <ChevronLeft size={28} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="cins-chat-lightbox-nav cins-chat-lightbox-nav--next"
              aria-label="Ảnh sau"
              onClick={goNext}
            >
              <ChevronRight size={28} strokeWidth={2} aria-hidden />
            </button>
            <p className="cins-chat-lightbox-counter" aria-live="polite">
              {index + 1}/{total}
            </p>
          </>
        ) : null}

        <figure className="cins-chat-lightbox-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="Ảnh đính kèm" decoding="async" />
        </figure>
      </div>
    </dialog>,
    document.body,
  );
}
