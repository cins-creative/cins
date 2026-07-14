"use client";

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
  const m = src.match(/\/embed\/([^?&/#]+)/i);
  return m?.[1] ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export function InlineExternalVideoEmbed({
  src,
  title = "Video nhúng",
  className,
  gate = true,
}: Props) {
  const preferred = toPreferredYoutubeEmbedSrc(src);
  const iframeSrc = preferred.includes("?")
    ? `${preferred}&rel=0`
    : `${preferred}?rel=0`;
  const poster = posterFromEmbedSrc(iframeSrc);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const wrapClass = `cins-inline-video-embed${className ? ` ${className}` : ""}`;

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
