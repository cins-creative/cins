"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { chatImageVariantUrl } from "@/lib/chat/image-url";
import { useHorizontalSwipe } from "@/lib/ui/use-horizontal-swipe";
import { usePinchZoomPan } from "@/lib/ui/use-pinch-zoom-pan";

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
  const activeThumbRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  const hasFilmstrip = total > 1;
  const { viewportRef, contentRef, isZoomed, gestureLock } = usePinchZoomPan(
    `${index}-${current}`,
  );

  const swipe = useHorizontalSwipe({
    enabled: hasFilmstrip && !isZoomed && !gestureLock,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`cins-chat-lightbox${hasFilmstrip ? " has-filmstrip" : ""}`}
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

        {hasFilmstrip ? (
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

        <figure
          ref={viewportRef}
          className={`cins-chat-lightbox-figure${isZoomed ? " is-zoomed" : ""}`}
          {...swipe}
        >
          <div ref={contentRef} className="cins-chat-lightbox-zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt="Ảnh đính kèm"
              decoding="async"
              draggable={false}
            />
          </div>
        </figure>

        {hasFilmstrip ? (
          <div className="cins-chat-lightbox-filmstrip" role="tablist" aria-label="Danh sách ảnh">
            <div className="cins-chat-lightbox-filmstrip-track">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  ref={i === index ? activeThumbRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Xem ảnh ${i + 1}/${total}`}
                  className={`cins-chat-lightbox-thumb${i === index ? " is-active" : ""}`}
                  onClick={() => onIndexChange(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chatImageVariantUrl(src, "thumbnail")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </dialog>,
    document.body,
  );
}
