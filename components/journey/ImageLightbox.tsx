"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { handleBlockImageError } from "@/lib/editor/resolve-image-seed-url";
import {
  gridLightboxSrc,
  gridThumbSrc,
  isPortraitGridImage,
  type GridImage,
} from "@/lib/journey/image-grid";
import type { WatermarkRenderDto } from "@/lib/journey/watermark";
import { JourneyImageWatermark } from "@/components/journey/JourneyImageWatermark";
import { useHorizontalSwipe } from "@/lib/ui/use-horizontal-swipe";
import { usePinchZoomPan } from "@/lib/ui/use-pinch-zoom-pan";

import "./journey-watermark.css";

type Props = {
  images: GridImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  watermark?: WatermarkRenderDto | null;
};

export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
  watermark = null,
}: Props) {
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
  } = usePinchZoomPan(`${index}-${current?.id ?? ""}`);

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
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss, index, onIndexChange, total]);

  useEffect(() => {
    if (!hasFilmstrip) return;
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [hasFilmstrip, index]);

  const swipe = useHorizontalSwipe({
    enabled: hasFilmstrip && !isZoomed && !gestureLock,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`image-lightbox${hasFilmstrip ? " has-filmstrip" : ""}${isImmersive ? " is-immersive" : ""}`}
      aria-label="Xem ảnh"
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) dismiss();
      }}
    >
      <div className="image-lightbox-inner">
        <div
          ref={viewportRef}
          className={`image-lightbox-stage${isZoomed ? " is-zoomed" : ""}`}
          {...swipe}
        >
          <button
            type="button"
            className="image-lightbox-close"
            aria-label={isImmersive ? "Thoát toàn màn hình" : "Đóng"}
            onClick={dismiss}
          >
            <X size={22} strokeWidth={2} aria-hidden />
          </button>

          {hasFilmstrip ? (
            <>
              <button
                type="button"
                className="image-lightbox-nav image-lightbox-nav--prev"
                aria-label="Ảnh trước"
                onClick={goPrev}
              >
                <ChevronLeft size={28} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="image-lightbox-nav image-lightbox-nav--next"
                aria-label="Ảnh sau"
                onClick={goNext}
              >
                <ChevronRight size={28} strokeWidth={2} aria-hidden />
              </button>
            </>
          ) : null}

          <figure className="image-lightbox-figure">
            <div ref={contentRef} className="image-lightbox-zoom j-wm-host">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gridLightboxSrc(current, isPortraitGridImage(current))}
                alt=""
                width={current.width}
                height={current.height}
                decoding="async"
                draggable={false}
                onError={handleBlockImageError}
              />
              {watermark ? (
                <JourneyImageWatermark dto={watermark} protect />
              ) : null}
            </div>
          </figure>
        </div>

        {hasFilmstrip ? (
          <div
            className="image-lightbox-filmstrip"
            role="tablist"
            aria-label="Danh sách ảnh"
          >
            <p className="image-lightbox-counter" aria-live="polite">
              {index + 1}/{total}
            </p>
            <div className="image-lightbox-filmstrip-track">
              {images.map((image, i) => {
                const thumbSrc = gridThumbSrc(image);
                return (
                  <button
                    key={`${image.id}-${i}`}
                    ref={i === index ? activeThumbRef : undefined}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Xem ảnh ${i + 1}/${total}`}
                    className={`image-lightbox-thumb${i === index ? " is-active" : ""}`}
                    onClick={() => onIndexChange(i)}
                  >
                    {thumbSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={thumbSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={handleBlockImageError}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </dialog>,
    document.body,
  );
}
