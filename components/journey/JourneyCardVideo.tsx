"use client";

import { Loader2, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BunnyNativeVideoPlayer } from "@/components/journey/BunnyNativeVideoPlayer";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { MilestoneVideoEmbed } from "@/components/journey/MilestoneVideoEmbed";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import type { Block } from "@/lib/editor/types";
import { youtubeVideoThumbnailUrl } from "@/lib/journey/post-media";
import {
  buildVideoIframeSrc,
  bunnyVideoIdFromBlocks,
  resolveBunnyEmbed,
} from "@/lib/journey/video-embed";
import { useResolvedVideoCanvasRatio } from "@/lib/journey/use-resolved-video-canvas-ratio";
import { useBunnyVideoProcessingReady } from "@/lib/journey/use-bunny-video-processing-ready";
import {
  videoCanvasRatioClass,
  videoPreviewDimensionsFromRatio,
} from "@/lib/journey/video-canvas-ratio";

type PreviewMedia = NonNullable<MilestoneItem["media"]>[number];

type Props = {
  url: string;
  title: string;
  processing?: boolean;
  preview?: PreviewMedia | null;
  noiDungBlocks?: Block[] | null;
};

export function resolveVideoPoster(
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
 * Video trên milestone card — Bunny: native MP4 480p + prefetch;
 * YouTube/Vimeo: iframe cải thiện (poster giữ đến khi iframe sẵn sàng).
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
  const canvasRatio = useResolvedVideoCanvasRatio(noiDungBlocks, bunnyVideoId);
  const canvasClass = videoCanvasRatioClass(canvasRatio);
  const posterDims = videoPreviewDimensionsFromRatio(canvasRatio);
  const posterWidth = preview?.width ?? posterDims.width;
  const posterHeight = preview?.height ?? posterDims.height;
  const bunnyEmbed = useMemo(
    () => resolveBunnyEmbed(url, bunnyVideoId),
    [url, bunnyVideoId],
  );
  const bunnyReady = useBunnyVideoProcessingReady(
    Boolean(processing),
    bunnyVideoId ?? bunnyEmbed?.videoId,
  );
  const showProcessing = Boolean(processing) && !bunnyReady;
  const iframeSrc = useMemo(
    () =>
      buildVideoIframeSrc(url, {
        autoplay: true,
        bunnyVideoId,
      }),
    [url, bunnyVideoId],
  );

  useEffect(() => {
    if (!playing) {
      setIframeReady(false);
    }
  }, [playing]);

  if (showProcessing) {
    return (
      <div
        className={`jcard-video-player ${canvasClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <MilestoneVideoEmbed
          url={url}
          title={title}
          processing
          bunnyVideoId={bunnyVideoId}
        />
      </div>
    );
  }

  if (bunnyEmbed) {
    return (
      <BunnyNativeVideoPlayer
        videoId={bunnyEmbed.videoId}
        title={title}
        poster={posterSrc}
        canvasClass={canvasClass}
        mode="feed"
        preview={
          preview
            ? {
                srcSet: preview.srcSet,
                width: posterWidth,
                height: posterHeight,
              }
            : null
        }
      />
    );
  }

  function renderPosterLayer(showLoading = false) {
    if (!posterSrc) return null;
    return (
      <div
        className={
          "jcard-video-poster-layer" + (iframeReady ? " is-hidden" : "")
        }
        aria-hidden={iframeReady}
      >
        <JourneyCoverImage
          src={posterSrc}
          srcSet={preview?.srcSet}
          sizes={preview?.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined}
          width={posterWidth}
          height={posterHeight}
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
    if (iframeSrc) {
      return (
        <div
          className={
            `jcard-video-player ${canvasClass}` +
            (iframeReady ? " is-playing-ready" : "")
          }
          onClick={(e) => e.stopPropagation()}
        >
          {renderPosterLayer(!iframeReady)}
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
          `jcard-video-player ${canvasClass}` +
          (iframeReady ? " is-playing-ready" : "")
        }
        onClick={(e) => e.stopPropagation()}
      >
        {renderPosterLayer(!iframeReady)}
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
      className={`preview preview--video jcard-video-trigger ${canvasClass}`}
      aria-label={`Phát video: ${title}`}
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
      }}
    >
      {posterSrc ? (
        <>
          <JourneyCoverImage
            src={posterSrc}
            srcSet={preview?.srcSet}
            sizes={preview?.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined}
            width={posterWidth}
            height={posterHeight}
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
