"use client";

import { useCallback, useState, type SyntheticEvent } from "react";

type MediaAspect = "landscape" | "portrait" | "square";

function aspectFromDimensions(width: number, height: number): MediaAspect {
  const ratio = width / height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.85) return "portrait";
  return "square";
}

/** Khớp token `--cins-chat-media-max-*` trên `.cins-chat-messages`. */
function maxBox(aspect: MediaAspect): { maxW: number; maxH: number } {
  if (aspect === "portrait") return { maxW: 240, maxH: 360 };
  if (aspect === "square") return { maxW: 260, maxH: 260 };
  return { maxW: 300, maxH: 360 };
}

function fitChatMedia(
  nw: number,
  nh: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const s = Math.min(1, maxW / nw, maxH / nh);
  return {
    w: Math.max(1, Math.round(nw * s)),
    h: Math.max(1, Math.round(nh * s)),
  };
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
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  const handleLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh) return;
      const nextAspect = aspectFromDimensions(nw, nh);
      setAspect(nextAspect);
      const { maxW, maxH } = maxBox(nextAspect);
      setBox(fitChatMedia(nw, nh, maxW, maxH));
    },
    [],
  );

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

  const sized = box && !stacked ? box : null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={imageClass}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={sized?.w}
      height={sized?.h}
      style={
        sized
          ? { width: sized.w, height: sized.h, maxWidth: "100%" }
          : undefined
      }
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
