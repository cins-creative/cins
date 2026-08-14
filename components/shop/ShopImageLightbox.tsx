"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { ShopImageProtect } from "@/components/shop/ShopImageProtect";
import { useHorizontalSwipe } from "@/lib/ui/use-horizontal-swipe";

type Props = {
  images: string[];
  index: number;
  watermarkText: string;
  protect?: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ShopImageLightbox({
  images,
  index,
  watermarkText,
  protect = true,
  onClose,
  onIndexChange,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const total = images.length;
  const current = images[index]?.trim() || "";
  const hasNav = total > 1;

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
      if (!hasNav) return;
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
  }, [hasNav, index, onClose, onIndexChange, total]);

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  const swipe = useHorizontalSwipe({
    enabled: hasNav,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="shop-img-lb"
      aria-label="Xem ảnh sản phẩm"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="shop-img-lb-stage" {...swipe}>
        <button
          type="button"
          className="shop-img-lb-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={22} strokeWidth={2} aria-hidden />
        </button>
        {hasNav ? (
          <>
            <button
              type="button"
              className="shop-img-lb-nav shop-img-lb-nav--prev"
              aria-label="Ảnh trước"
              onClick={goPrev}
            >
              <ChevronLeft size={28} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="shop-img-lb-nav shop-img-lb-nav--next"
              aria-label="Ảnh sau"
              onClick={goNext}
            >
              <ChevronRight size={28} strokeWidth={2} aria-hidden />
            </button>
          </>
        ) : null}
        <figure className="shop-img-lb-figure">
          <ShopImageProtect
            src={current}
            alt=""
            protect={protect}
            watermarkText={protect ? watermarkText : null}
            fit="contain"
            imgClassName="shop-img-lb-img"
            decoding="async"
          />
        </figure>
        {hasNav ? (
          <p className="shop-img-lb-counter" aria-live="polite">
            {index + 1}/{total}
          </p>
        ) : null}
      </div>
    </dialog>,
    document.body,
  );
}
