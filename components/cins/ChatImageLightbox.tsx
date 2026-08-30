"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { chatImageVariantUrl } from "@/lib/chat/image-url";
import { useHorizontalSwipe } from "@/lib/ui/use-horizontal-swipe";
import { usePinchZoomPan } from "@/lib/ui/use-pinch-zoom-pan";
import { useT } from "@/lib/i18n/use-t";

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
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const total = images.length;
  const current = images[index];
  const hasFilmstrip = total > 1;
  const {
    viewportRef,
    contentRef,
    isZoomed,
    isImmersive,
    gestureLock,
    exitImmersive,
  } = usePinchZoomPan(`${index}-${current}`);

  const dismiss = useCallback(() => {
    if (isImmersive) exitImmersive();
    else onClose();
  }, [exitImmersive, isImmersive, onClose]);

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

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
        e.stopPropagation();
        e.stopImmediatePropagation();
        dismiss();
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
    /* Capture: chặn ESC trước overlay/mini chat (cùng keydown sẽ đóng cả bảng chat). */
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [dismiss, index, onIndexChange, total]);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  const swipe = useHorizontalSwipe({
    enabled: hasFilmstrip && !isZoomed && !gestureLock,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`cins-chat-lightbox${hasFilmstrip ? " has-filmstrip" : ""}${isImmersive ? " is-immersive" : ""}`}
      aria-label={t("chat.lightbox")}
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) dismiss();
      }}
    >
      <div className="cins-chat-lightbox-inner">
        <button
          type="button"
          className="cins-chat-lightbox-close"
          aria-label={isImmersive ? "Thoát toàn màn hình" : t("chat.close")}
          onClick={dismiss}
        >
          <X size={22} strokeWidth={2} aria-hidden />
        </button>

        {hasFilmstrip ? (
          <>
            <button
              type="button"
              className="cins-chat-lightbox-nav cins-chat-lightbox-nav--prev"
              aria-label={t("chat.prevPhoto")}
              onClick={goPrev}
            >
              <ChevronLeft size={28} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="cins-chat-lightbox-nav cins-chat-lightbox-nav--next"
              aria-label={t("chat.nextPhoto")}
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
              alt={t("chat.photoAttached")}
              decoding="async"
              draggable={false}
            />
          </div>
        </figure>

        {hasFilmstrip ? (
          <div className="cins-chat-lightbox-filmstrip" role="tablist" aria-label={t("chat.photoList")}>
            <div className="cins-chat-lightbox-filmstrip-track">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  ref={i === index ? activeThumbRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={t("chat.photoN", { i: i + 1, total })}
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
