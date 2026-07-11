"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { handleBlockImageError } from "@/lib/editor/resolve-image-seed-url";
import {
  gridLightboxSrc,
  isPortraitGridImage,
  type GridImage,
} from "@/lib/journey/image-grid";

type Props = {
  images: GridImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: Props) {
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
      className="image-lightbox"
      aria-label="Xem ảnh"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="image-lightbox-inner">
        <button
          type="button"
          className="image-lightbox-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={22} strokeWidth={2} aria-hidden />
        </button>

        {total > 1 ? (
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
            <p className="image-lightbox-counter" aria-live="polite">
              {index + 1}/{total}
            </p>
          </>
        ) : null}

        <figure className="image-lightbox-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gridLightboxSrc(current, isPortraitGridImage(current))}
            alt=""
            width={current.width}
            height={current.height}
            decoding="async"
            onError={handleBlockImageError}
          />
        </figure>
      </div>
    </dialog>,
    document.body,
  );
}
