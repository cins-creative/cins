"use client";

import { Play } from "lucide-react";
import { useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  width?: number | null;
  height?: number | null;
  /** media-only bubble → chiếm trọn khung; có caption → gọn hơn. */
  stacked?: boolean;
};

/** Video chat trên R2 — click-to-play (không autoplay, tiết kiệm băng thông). */
export function ChatMessageVideo({
  src,
  poster,
  width,
  height,
  stacked = false,
}: Props) {
  const [playing, setPlaying] = useState(false);

  const ratio =
    width && height && width > 0 && height > 0
      ? `${width} / ${height}`
      : "16 / 9";

  if (playing) {
    return (
      <video
        className={`cins-chat-msg-video${stacked ? " is-stacked" : ""}`}
        src={src}
        poster={poster ?? undefined}
        style={{ aspectRatio: ratio }}
        controls
        autoPlay
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <button
      type="button"
      className={`cins-chat-msg-video-poster${stacked ? " is-stacked" : ""}`}
      style={{ aspectRatio: ratio }}
      aria-label="Phát video"
      onClick={() => setPlaying(true)}
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="cins-chat-msg-video-fallback" aria-hidden />
      )}
      <span className="cins-chat-msg-video-play" aria-hidden>
        <Play size={22} strokeWidth={2} fill="currentColor" />
      </span>
    </button>
  );
}
