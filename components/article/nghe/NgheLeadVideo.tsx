"use client";

import { parseLeadVideoUrl } from "@/lib/articles/lead-video-url";

type Props = { url: string };

/** Video đầu `.nghe-lead-panel` từ `article_bai_viet.meta.video_url`. */
export function NgheLeadVideo({ url }: Props) {
  const parsed = parseLeadVideoUrl(url);
  if (!parsed) return null;

  if (parsed.kind === "iframe") {
    return (
      <div className="nghe-lead-video nghe-lead-video--embed">
        <iframe
          key={parsed.src}
          src={parsed.src}
          title="Video giới thiệu nghề"
          className="nghe-lead-video-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div className="nghe-lead-video nghe-lead-video--file">
      <video
        className="nghe-lead-video-el"
        controls
        playsInline
        preload="metadata"
        src={parsed.src}
      />
    </div>
  );
}
