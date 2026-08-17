"use client";

import { Loader2, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { MilestoneVideoEmbed } from "@/components/journey/MilestoneVideoEmbed";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  buildStreamThumbnailUrl,
  classifyStreamVideoUrl,
} from "@/lib/cloudflare/stream-embed";
import type { Block } from "@/lib/editor/types";
import { youtubeVideoThumbnailUrl } from "@/lib/journey/post-media";
import {
  buildVideoIframeSrc,
  resolveVideoThumbnailFromBlocks,
  videoHintsFromBlocks,
  videoIdFromBlocks,
} from "@/lib/journey/video-embed";
import { setShareDragData } from "@/lib/cins/share-drag";
import { useOffscreenMedia } from "@/lib/journey/use-offscreen-media";
import { useResolvedVideoCanvas } from "@/lib/journey/use-resolved-video-canvas-ratio";
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
  /** Thay phát inline — vd. mở Reels trên World Journey. */
  onPlay?: () => void;
};

export function resolveVideoPoster(
  url: string,
  preview?: PreviewMedia | null,
): string | null {
  if (preview?.src?.trim()) return preview.src.trim();

  const stream = classifyStreamVideoUrl(url);
  if (stream) return buildStreamThumbnailUrl(stream.uid);

  return youtubeVideoThumbnailUrl(url);
}

/**
 * Video trên milestone card — Cloudflare Stream / YouTube / Vimeo:
 * poster giữ đến khi iframe sẵn sàng.
 */
export function JourneyCardVideo({
  url,
  title,
  processing,
  preview,
  noiDungBlocks,
  onPlay,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const stopPlayback = useCallback(() => setPlaying(false), []);
  const { ref: rootRef } = useOffscreenMedia<HTMLDivElement>({
    enabled: playing,
    threshold: 0.2,
    onLeave: stopPlayback,
  });
  const hints = useMemo(
    () => videoHintsFromBlocks(noiDungBlocks),
    [noiDungBlocks],
  );
  const posterSrc =
    resolveVideoPoster(url, preview) ??
    resolveVideoThumbnailFromBlocks(noiDungBlocks);
  const videoId = useMemo(
    () => videoIdFromBlocks(noiDungBlocks) ?? hints.videoId ?? null,
    [noiDungBlocks, hints.videoId],
  );
  const { ratio: canvasRatio, aspect: canvasAspect } = useResolvedVideoCanvas(
    noiDungBlocks,
    videoId,
  );
  const canvasClass = videoCanvasRatioClass(canvasRatio);
  const canvasStyle = {
    ["--media-natural-aspect" as string]: String(canvasAspect),
  };
  const posterDims = videoPreviewDimensionsFromRatio(canvasRatio);
  const posterWidth = preview?.width ?? posterDims.width;
  const posterHeight = preview?.height ?? posterDims.height;
  const showProcessing = Boolean(processing);
  const iframeSrc = useMemo(
    () =>
      buildVideoIframeSrc(url, {
        autoplay: true,
        videoProvider: hints.videoProvider,
        videoId: hints.videoId ?? videoId,
      }),
    [url, videoId, hints.videoProvider, hints.videoId],
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
        style={canvasStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <MilestoneVideoEmbed
          url={url}
          title={title}
          processing
          videoProvider={hints.videoProvider}
          videoId={hints.videoId ?? videoId}
        />
      </div>
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
          objectPosition={preview?.objectPosition}
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
          ref={rootRef}
          className={
            `jcard-video-player ${canvasClass}` +
            (iframeReady ? " is-playing-ready" : "")
          }
          style={canvasStyle}
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
        ref={rootRef}
        className={
          `jcard-video-player ${canvasClass}` +
          (iframeReady ? " is-playing-ready" : "")
        }
        style={canvasStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {renderPosterLayer(!iframeReady)}
        <MilestoneVideoEmbed
          url={url}
          title={title}
          autoplay
          videoProvider={hints.videoProvider}
          videoId={hints.videoId ?? videoId}
          onIframeLoad={() => setIframeReady(true)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`preview preview--video jcard-video-trigger ${canvasClass}`}
      style={canvasStyle}
      aria-label={`Phát video: ${title}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onPlay) {
          onPlay();
          return;
        }
        setPlaying(true);
      }}
      /* Kéo poster video → gửi URL video vào chat (desktop). */
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setShareDragData(e.dataTransfer, { kind: "url", url });
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
            objectPosition={preview?.objectPosition}
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
