"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import "@/components/shared/inline-external-video-embed.css";

import { ViewportGatedEmbed } from "@/components/journey/ViewportGatedEmbed";

type Props = {
  src: string;
  title?: string;
  className?: string;
  /**
   * `true` (mặc định): chỉ mount iframe khi gần viewport (journey/comment).
   * `false`: luôn mount — dùng trong chat bubble (tránh gate height=0).
   */
  gate?: boolean;
  /**
   * `embed` (mặc định): phát inline qua iframe.
   * `new-tab`: chỉ thumbnail + nút play → mở URL gốc ở tab mới (chat).
   */
  openMode?: "embed" | "new-tab";
  /** URL mở tab mới khi `openMode="new-tab"` (watch/share). */
  href?: string | null;
};

/** Prefer youtube.com/embed — khớp oEmbed; tránh lỗi cấu hình trên nocookie. */
function toPreferredYoutubeEmbedSrc(src: string): string {
  try {
    const u = new URL(src);
    if (
      u.hostname === "www.youtube-nocookie.com" ||
      u.hostname === "youtube-nocookie.com"
    ) {
      u.hostname = "www.youtube.com";
      return u.toString();
    }
  } catch {
    /* keep src */
  }
  return src;
}

function posterFromEmbedSrc(src: string): string | null {
  const yt = src.match(/\/embed\/([^?&/#]+)/i);
  if (yt?.[1]) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}

/** Fallback watch URL từ iframe embed khi thiếu `href`. */
function watchUrlFromEmbedSrc(src: string): string | null {
  try {
    const u = new URL(src);
    const yt = u.pathname.match(/\/embed\/([^/]+)/i);
    if (yt?.[1]) return `https://www.youtube.com/watch?v=${yt[1]}`;
    const vimeo = u.pathname.match(/\/video\/(\d+)/i);
    if (vimeo?.[1] && u.hostname.includes("vimeo")) {
      return `https://vimeo.com/${vimeo[1]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function InlineExternalVideoEmbed({
  src,
  title = "Video nhúng",
  className,
  gate = true,
  openMode = "embed",
  href = null,
}: Props) {
  const preferred = toPreferredYoutubeEmbedSrc(src);
  const iframeSrc = preferred.includes("?")
    ? `${preferred}&rel=0`
    : `${preferred}?rel=0`;
  const poster = posterFromEmbedSrc(iframeSrc);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const wrapClass = `cins-inline-video-embed${className ? ` ${className}` : ""}`;

  if (openMode === "new-tab") {
    const targetHref =
      href?.trim() || watchUrlFromEmbedSrc(iframeSrc) || null;
    if (!targetHref) return null;

    return (
      <a
        className={`${wrapClass} is-link-out`}
        href={targetHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Mở ${title} trong tab mới`}
        title="Mở video trong tab mới"
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="cins-inline-video-embed-poster"
            src={poster}
            alt=""
            decoding="async"
          />
        ) : (
          <span className="cins-inline-video-embed-fallback" aria-hidden />
        )}
        <span className="cins-inline-video-embed-play" aria-hidden>
          <Play size={28} strokeWidth={2.2} fill="currentColor" />
        </span>
      </a>
    );
  }

  const iframe = (
    <iframe
      src={iframeSrc}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading={gate ? "lazy" : "eager"}
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => setIframeLoaded(true)}
    />
  );

  const body = (
    <>
      {poster && !iframeLoaded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="cins-inline-video-embed-poster"
          src={poster}
          alt=""
          decoding="async"
        />
      ) : null}
      {iframe}
    </>
  );

  if (!gate) {
    return <div className={wrapClass}>{body}</div>;
  }

  return <ViewportGatedEmbed className={wrapClass}>{body}</ViewportGatedEmbed>;
}
