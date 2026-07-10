"use client";

import { useCallback, useState, type SyntheticEvent } from "react";

type MediaAspect = "landscape" | "portrait" | "square";

function aspectFromDimensions(width: number, height: number): MediaAspect {
  const ratio = width / height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.85) return "portrait";
  return "square";
}

type Props = {
  src: string;
  alt: string;
  onClick?: () => void;
  /** Ảnh nằm trên caption — bo góc chỉ phía trên. */
  stacked?: boolean;
};

export function ChatMessageMediaImage({ src, alt, onClick, stacked }: Props) {
  const [aspect, setAspect] = useState<MediaAspect | null>(null);

  const handleLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    setAspect(aspectFromDimensions(img.naturalWidth, img.naturalHeight));
  }, []);

  const frameClass = [
    "cins-chat-msg-image-frame",
    stacked ? "is-stacked-top" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const imageClass = [
    "cins-chat-msg-image",
    aspect ? `is-${aspect}` : "is-loading",
  ].join(" ");

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={imageClass}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${frameClass} cins-chat-msg-image-link`}
        aria-label="Xem ảnh đính kèm"
        onClick={onClick}
      >
        {image}
      </button>
    );
  }

  return <span className={frameClass}>{image}</span>;
}
