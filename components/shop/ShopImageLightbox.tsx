"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { ShopImageProtect } from "@/components/shop/ShopImageProtect";
import { useHorizontalSwipe } from "@/lib/ui/use-horizontal-swipe";
import { usePinchZoomPan } from "@/lib/ui/use-pinch-zoom-pan";

type Props = {
  images: string[];
  index: number;
  watermarkText: string;
  protect?: boolean;
  /** Tên sản phẩm tương ứng từng URL — hiện dưới ảnh khi xem catalog kiosk. */
  captions?: Array<string | null | undefined>;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ShopImageLightbox({
  images,
  index,
  watermarkText,
  protect = true,
  captions,
  onClose,
  onIndexChange,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const total = images.length;
  const current = images[index]?.trim() || "";
  const caption = captions?.[index]?.trim() || "";
  const hasNav = total > 1;
  const wm = watermarkText.trim();
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
        dismiss();
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
  }, [dismiss, hasNav, index, onIndexChange, total]);

  useEffect(() => {
    if (!hasNav) return;
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [hasNav, index]);

  const swipe = useHorizontalSwipe({
    enabled: hasNav && !isZoomed && !gestureLock,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`shop-img-lb${hasNav ? " has-filmstrip" : ""}${isImmersive ? " is-immersive" : ""}`}
      aria-label={caption || "Xem ảnh sản phẩm"}
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) dismiss();
      }}
    >
      <div className="shop-img-lb-inner">
        <div
          ref={viewportRef}
          className={`shop-img-lb-stage${isZoomed ? " is-zoomed" : ""}`}
          {...swipe}
        >
          <button
            type="button"
            className="shop-img-lb-close"
            aria-label={isImmersive ? "Thoát toàn màn hình" : "Đóng"}
            onClick={dismiss}
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
            <div ref={contentRef} className="shop-img-lb-zoom">
              <ShopImageProtect
                src={current}
                alt={caption}
                protect={protect}
                watermarkText={wm || null}
                fit="contain"
                imgClassName="shop-img-lb-img"
                decoding="async"
              />
            </div>
          </figure>
        </div>

        {hasNav ? (
          <div
            className="shop-img-lb-filmstrip"
            role="tablist"
            aria-label="Danh mục ảnh hàng"
          >
            {caption ? (
              <p className="shop-img-lb-caption">{caption}</p>
            ) : null}
            <p className="shop-img-lb-counter" aria-live="polite">
              {index + 1}/{total}
            </p>
            <div className="shop-img-lb-filmstrip-track">
              {images.map((src, i) => {
                const url = src.trim();
                const label = captions?.[i]?.trim() || `Ảnh ${i + 1}`;
                return (
                  <button
                    key={`${url}-${i}`}
                    ref={i === index ? activeThumbRef : undefined}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Xem ảnh ${label}`}
                    className={`shop-img-lb-thumb${i === index ? " is-active" : ""}`}
                    onClick={() => onIndexChange(i)}
                  >
                    {url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={url} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : caption ? (
          <p className="shop-img-lb-caption shop-img-lb-caption--solo">
            {caption}
          </p>
        ) : null}
      </div>
    </dialog>,
    document.body,
  );
}
