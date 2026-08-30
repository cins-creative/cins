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
  const playingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    playingRef.current = false;
    setPlaying(false);
    if (known && width && height) applyNaturalSize(width, height);
    // applyNaturalSize ổn định qua ref; không đưa vào deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, width, height]);

  const aspectStyle = { aspectRatio: ratio ?? "16 / 9" };

  const startPlayback = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    playingRef.current = true;
    const video = videoRef.current;
    /* play() trong cùng stack với tap — iOS không cho autoplay sau khi mount <video> mới. */
    if (video) {
      video.playsInline = true;
      video.setAttribute("webkit-playsinline", "true");
      void video.play().catch(() => {
        /* Native controls vẫn hiện; user tap play trên thanh điều khiển. */
      });
    }
    setPlaying(true);
  };

  return (
    <div
      className={`cins-chat-msg-video-root${stacked ? " is-stacked" : ""}`}
      style={aspectStyle}
    >
      <video
        ref={videoRef}
        className={`cins-chat-msg-video${stacked ? " is-stacked" : ""}`}
        src={src}
        poster={posterSrc ?? undefined}
        controls={playing}
        playsInline
        preload="metadata"
        onClick={(e) => e.stopPropagation()}
        onPlay={() => {
          playingRef.current = true;
          setPlaying(true);
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          applyNaturalSize(v.videoWidth, v.videoHeight);
        }}
        onLoadedData={(e) => {
          if (playingRef.current) return;
          const v = e.currentTarget;
          applyNaturalSize(v.videoWidth, v.videoHeight);
          try {
            if (v.currentTime < 0.05) {
              v.currentTime = Math.min(
                0.12,
                Math.max(0.05, (v.duration || 1) * 0.02),
              );
            }
          } catch {
            /* ignore seek errors */
          }
        }}
      />
      {playing ? null : (
        <button
          type="button"
          className={`cins-chat-msg-video-poster${stacked ? " is-stacked" : ""}`}
          aria-label="Phát video"
          onClick={startPlayback}
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
          ) : null}
          <span className="cins-chat-msg-video-play" aria-hidden>
            <Play size={22} strokeWidth={2} fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
