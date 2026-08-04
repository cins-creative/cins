"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  width?: number | null;
  height?: number | null;
  /** media-only bubble → chiếm trọn khung; có caption → gọn hơn. */
  stacked?: boolean;
  /** Báo kích thước gốc (canvas fit node / cập nhật ratio). */
  onNaturalSize?: (naturalW: number, naturalH: number) => void;
};

function ratioFromDims(w: number, h: number): string | null {
  if (!(w > 0 && h > 0)) return null;
  return `${w} / ${h}`;
}

/** Video chat trên R2 — click-to-play (không autoplay, tiết kiệm băng thông). */
export function ChatMessageVideo({
  src,
  poster,
  width,
  height,
  stacked = false,
  onNaturalSize,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState<string | null>(() =>
    ratioFromDims(width ?? 0, height ?? 0),
  );
  const reportedRef = useRef(false);
  const onNaturalSizeRef = useRef(onNaturalSize);
  onNaturalSizeRef.current = onNaturalSize;
  const posterSrc = poster?.trim() || null;

  const applyNaturalSize = (w: number, h: number) => {
    if (!(w > 0 && h > 0)) return;
    setRatio(`${w} / ${h}`);
    if (reportedRef.current) return;
    reportedRef.current = true;
    onNaturalSizeRef.current?.(w, h);
  };

  useEffect(() => {
    reportedRef.current = false;
    const known = ratioFromDims(width ?? 0, height ?? 0);
    setRatio(known);
    setPlaying(false);
    if (known && width && height) {
      applyNaturalSize(width, height);
      return;
    }

    /* Probe riêng — preload=metadata trên <video> trong button đôi khi để videoWidth=0. */
    let cancelled = false;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };

    const tryApply = () => {
      if (cancelled) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        applyNaturalSize(video.videoWidth, video.videoHeight);
        cleanup();
      }
    };

    video.onloadedmetadata = tryApply;
    video.onloadeddata = tryApply;
    video.onerror = () => {
      if (!cancelled) cleanup();
    };
    video.src = src.includes("#") ? src : `${src}#t=0.001`;

    return () => {
      cancelled = true;
      cleanup();
    };
    // applyNaturalSize ổn định qua ref; không đưa vào deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, width, height]);

  const aspectStyle = { aspectRatio: ratio ?? "16 / 9" };

  if (playing) {
    return (
      <video
        className={`cins-chat-msg-video${stacked ? " is-stacked" : ""}`}
        src={src}
        poster={posterSrc ?? undefined}
        style={aspectStyle}
        controls
        autoPlay
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          applyNaturalSize(v.videoWidth, v.videoHeight);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`cins-chat-msg-video-poster${stacked ? " is-stacked" : ""}`}
      style={aspectStyle}
      aria-label="Phát video"
      onClick={() => setPlaying(true)}
    >
      {posterSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            const img = e.currentTarget;
            applyNaturalSize(img.naturalWidth, img.naturalHeight);
          }}
        />
      ) : (
        <video
          className="cins-chat-msg-video-thumb"
          src={src.includes("#") ? src : `${src}#t=0.001`}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            applyNaturalSize(v.videoWidth, v.videoHeight);
          }}
          onLoadedData={(e) => {
            const v = e.currentTarget;
            applyNaturalSize(v.videoWidth, v.videoHeight);
            try {
              if (v.currentTime < 0.05) {
                v.currentTime = Math.min(0.12, Math.max(0.05, (v.duration || 1) * 0.02));
              }
            } catch {
              /* ignore seek errors */
            }
          }}
        />
      )}
      <span className="cins-chat-msg-video-play" aria-hidden>
        <Play size={22} strokeWidth={2} fill="currentColor" />
      </span>
    </button>
  );
}
