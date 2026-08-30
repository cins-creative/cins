"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { handleBlockImageError } from "@/lib/editor/resolve-image-seed-url";
import { usePinchZoomPan } from "@/lib/ui/use-pinch-zoom-pan";

export type MediaFocusItem = {
  src: string;
  isVideo?: boolean;
  width?: number;
  height?: number;
};

type Props = {
  item: MediaFocusItem;
  onClose: () => void;
};

function isPlayableVideoSrc(src: string, isVideo?: boolean) {
  if (!isVideo) return false;
  return (
    /^blob:/i.test(src) ||
    /^data:video\//i.test(src) ||
    /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(src)
  );
}

/** Full-screen chỉ media + nút tắt — pinch/pan/wheel zoom. */
export function MediaFocusLightbox({ item, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { viewportRef, contentRef, isZoomed } = usePinchZoomPan(
    item.src,
    { lockedImmersive: true },
  );
  const playVideo = isPlayableVideoSrc(item.src, item.isVideo);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (!item.src || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="image-lightbox is-immersive"
      aria-label="Xem media"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="image-lightbox-inner">
        <div
          ref={viewportRef}
          className={`image-lightbox-stage${isZoomed ? " is-zoomed" : ""}`}
        >
          <button
            type="button"
            className="image-lightbox-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={22} strokeWidth={2} aria-hidden />
          </button>
          <figure className="image-lightbox-figure">
            <div ref={contentRef} className="image-lightbox-zoom">
              {playVideo ? (
                <video
                  src={item.src}
                  width={item.width}
                  height={item.height}
                  playsInline
                  muted
                  controls
                  draggable={false}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt=""
                  width={item.width}
                  height={item.height}
                  decoding="async"
                  draggable={false}
                  onError={handleBlockImageError}
                />
              )}
            </div>
          </figure>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
