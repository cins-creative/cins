"use client";

import {
  isKeywordShortVideoUrl,
  parseLeadVideoUrl,
} from "@/lib/articles/lead-video-url";

type Props = { url: string };

/** Video Short YouTube 9:16 trong khối tổng quan keyword. */
export function KeywordShortVideo({ url }: Props) {
  const parsed = parseLeadVideoUrl(url);
  if (!parsed) return null;

  const isShort =
    parsed.aspect === "9/16" || isKeywordShortVideoUrl(url);

  if (parsed.kind === "iframe") {
    return (
      <figure
        className={[
          "kw-short-video",
          isShort ? "kw-short-video--portrait" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isShort ? (
          <span className="kw-short-video__badge" aria-hidden>
            Short
          </span>
        ) : null}
        <div className="kw-short-video__frame">
          <iframe
            key={parsed.src}
            src={parsed.src}
            title="Video Short giới thiệu keyword"
            className="kw-short-video__iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </figure>
    );
  }

  return (
    <figure className="kw-short-video kw-short-video--portrait">
      <div className="kw-short-video__frame">
        <video
          className="kw-short-video__el"
          controls
          playsInline
          preload="metadata"
          src={parsed.src}
        />
      </div>
    </figure>
  );
}
