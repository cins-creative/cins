"use client";

import { Loader2, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { MilestoneVideoEmbed } from "@/components/journey/MilestoneVideoEmbed";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { Block } from "@/lib/editor/types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import { youtubeVideoThumbnailUrl } from "@/lib/journey/post-media";
import {
  buildVideoIframeSrc,
  bunnyVideoIdFromBlocks,
} from "@/lib/journey/video-embed";

type PreviewMedia = NonNullable<MilestoneItem["media"]>[number];

type Props = {
  url: string;
  title: string;
  processing?: boolean;
  preview?: PreviewMedia | null;
  noiDungBlocks?: Block[] | null;
};

function resolveVideoPoster(
  url: string,
  preview?: PreviewMedia | null,
): string | null {
  if (preview?.src?.trim()) return preview.src.trim();

  const bunny = classifyBunnyVideoUrl(url);
  const cdn = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME?.trim();
  if (bunny && cdn) {
    return `https://${cdn}/${bunny.videoId}/thumbnail.jpg`;
  }

  return youtubeVideoThumbnailUrl(url);
}

/**
 * Video trên milestone card — chạm/click phát inline trong khung 16:9, không fullscreen.
 */
export function JourneyCardVideo({
  url,
  title,
  processing,
  preview,
  noiDungBlocks,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const posterSrc = resolveVideoPoster(url, preview);
  const bunnyVideoId = useMemo(
    () => bunnyVideoIdFromBlocks(noiDungBlocks),
    [noiDungBlocks],
  );
  const iframeSrc = useMemo(
    () =>
      buildVideoIframeSrc(url, {
        autoplay: true,
        bunnyVideoId,
      }),
    [url, bunnyVideoId],
  );

  useEffect(() => {
    if (!playing) setIframeReady(false);
  }, [playing, url]);

  function renderPosterLayer(showLoading = false) {
    if (!posterSrc) return null;
    return (
      <div
        className={
          "jcard-video-poster-layer" +
          (iframeReady ? " is-hidden" : "")
        }
        aria-hidden={iframeReady}
      >
        <JourneyCoverImage
          src={posterSrc}
          srcSet={preview?.srcSet}
          sizes={preview?.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined}
          width={preview?.width ?? 1280}
          height={preview?.height ?? 720}
          alt=""
        />
        {showLoading ? (
          <span className="jcard-video-play jcard-video-play--loading" aria-hidden>
            <Loader2 size={26} strokeWidth={2.2} />
          </span>
        ) : null}
      </div>
    );
  }

  if (playing) {
    if (processing) {
      return (
        <div className="jcard-video-player" onClick={(e) => e.stopPropagation()}>
          <MilestoneVideoEmbed
            url={url}
            title={title}
            processing
            bunnyVideoId={bunnyVideoId}
          />
        </div>
      );
    }

    if (iframeSrc) {
      return (
        <div
          className={
            "jcard-video-player" + (iframeReady ? " is-playing-ready" : "")
          }
          onClick={(e) => e.stopPropagation()}
        >
          {renderPosterLayer(true)}
          <iframe
            src={iframeSrc}
            title={title}
            className="jcard-video-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="eager"
            onLoad={() => setIframeReady(true)}
          />
        </div>
      );
    }

    return (
      <div
        className={
          "jcard-video-player" + (iframeReady ? " is-playing-ready" : "")
        }
        onClick={(e) => e.stopPropagation()}
      >
        {renderPosterLayer(true)}
        <MilestoneVideoEmbed
          url={url}
          title={title}
          autoplay
          bunnyVideoId={bunnyVideoId}
          onIframeLoad={() => setIframeReady(true)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="preview preview--video jcard-video-trigger"
      aria-label={`Phát video: ${title}`}
      disabled={processing}
      onClick={(e) => {
        e.stopPropagation();
        if (!processing) setPlaying(true);
      }}
    >
      {processing ? (
        <MilestoneVideoEmbed
          url={url}
          title={title}
          processing
          bunnyVideoId={bunnyVideoId}
        />
      ) : posterSrc ? (
        <>
          <JourneyCoverImage
            src={posterSrc}
            srcSet={preview?.srcSet}
            sizes={preview?.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined}
            width={preview?.width ?? 1280}
            height={preview?.height ?? 720}
            alt=""
          />
          <span className="jcard-video-play" aria-hidden>
            <Play size={28} strokeWidth={2} fill="currentColor" />
          </span>
        </>
      ) : (
        <>
          <div className="preview-inner jcard-video-poster">
            <Play size={36} strokeWidth={1.8} aria-hidden />
          </div>
          <span className="jcard-video-play" aria-hidden>
            <Play size={28} strokeWidth={2} fill="currentColor" />
          </span>
        </>
      )}
    </button>
  );
}
