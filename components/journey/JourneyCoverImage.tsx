"use client";

import type { CSSProperties } from "react";

import { handleBlockImageError } from "@/lib/editor/resolve-image-seed-url";

type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  /** Above-the-fold — eager + fetchPriority high. */
  priority?: boolean;
  className?: string;
  /** Điểm neo thumbnail — `object-position`. */
  objectPosition?: string;
  /** Phóng quanh điểm neo — `transform: scale`. */
  zoom?: number;
  /** Gọi khi img hết fallback (CF public) vẫn lỗi — gallery chuyển sang frame video. */
  onFinalError?: () => void;
};

/** CF variant nhỏ / flexible gravity có thể 403 — fallback sang `public`. */
function imagedeliveryPublicUrl(url: string): string {
  return url.replace(
    /(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+)\/(?:thumbnail|medium|cover|avatar|grid|gridsm|w=[^/?#]+)(?=\/|\?|$)/i,
    "$1/public",
  );
}

/**
 * `<img>` chuẩn Journey — lazy mặc định, dimensions chống CLS, srcset CF.
 */
export function JourneyCoverImage({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  priority = false,
  className,
  objectPosition,
  zoom,
  onFinalError,
}: Props) {
  if (!src) return null;

  const style: CSSProperties | undefined = (() => {
    const z = typeof zoom === "number" && Number.isFinite(zoom) ? zoom : 1;
    if (!objectPosition && z <= 1.001) return undefined;
    const next: CSSProperties = {};
    if (objectPosition) next.objectPosition = objectPosition;
    if (z > 1.001) {
      next.transform = `scale(${z})`;
      next.transformOrigin = objectPosition || "50% 50%";
    }
    return next;
  })();

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      className={className}
      style={style}
      onError={(event) => {
        const img = event.currentTarget;
        const current = img.currentSrc || img.src;
        if (
          /imagedelivery\.net/i.test(current) &&
          img.dataset.cfPublicFallback !== "1"
        ) {
          const next = imagedeliveryPublicUrl(current);
          if (next !== current) {
            img.dataset.cfPublicFallback = "1";
            img.removeAttribute("srcset");
            img.src = next;
            return;
          }
        }
        handleBlockImageError(event);
        onFinalError?.();
      }}
    />
  );
}
