"use client";

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
};

/** CF variant tùy chỉnh có thể 403 — fallback sang `public`. */
function imagedeliveryPublicUrl(url: string): string {
  return url.replace(
    /(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+)\/(?:thumbnail|medium|cover|avatar)(?=\/|\?|$)/i,
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
}: Props) {
  if (!src) return null;

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
      onError={(event) => {
        const img = event.currentTarget;
        if (img.dataset.cfPublicFallback === "1") return;
        const next = imagedeliveryPublicUrl(img.currentSrc || img.src);
        if (next === img.src && next === img.currentSrc) return;
        img.dataset.cfPublicFallback = "1";
        img.removeAttribute("srcset");
        img.src = next;
      }}
    />
  );
}
