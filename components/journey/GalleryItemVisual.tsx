"use client";

import { Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import type { EmbedProviderId } from "@/lib/editor/embed-providers";
import { embedPlatformLogoSrc } from "@/lib/editor/embed-platform-logos";
import { setCachedVideoAspect } from "@/lib/journey/gallery-video-dimension-cache";

type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  priority?: boolean;
  isVideo?: boolean;
  videoProcessing?: boolean;
  /** MP4 Bunny — hiển thị frame đầu khi không có / lỗi thumbnail. */
  videoPreviewSrc?: string | null;
  objectPosition?: string;
  zoom?: number;
};

const MP4_QUALITIES = ["360p", "480p", "720p", "1080p"] as const;

function mp4FallbackUrls(primary: string): string[] {
  const trimmed = primary.trim();
  if (!trimmed) return [];
  const out: string[] = [trimmed];
  for (const quality of MP4_QUALITIES) {
    const variant = trimmed.replace(/play_[^/]+\.mp4$/i, `play_${quality}.mp4`);
    if (variant !== trimmed && !out.includes(variant)) out.push(variant);
  }
  const generic = trimmed.replace(/play_[^/]+\.mp4$/i, "play.mp4");
  if (generic !== trimmed && !out.includes(generic)) out.push(generic);
  return out;
}

function GalleryVideoFrameThumb({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const candidates = useMemo(() => mp4FallbackUrls(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSrc = candidates[candidateIndex] ?? null;
  const exhausted = !activeSrc || candidateIndex >= candidates.length;

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;
    video.load();
  }, [activeSrc]);

  if (exhausted) {
    return (
      <span className="j-gallery-video-ph" aria-hidden>
        Video
      </span>
    );
  }

  return (
    /* eslint-disable-next-line jsx-a11y/media-has-caption */
    <video
      ref={videoRef}
      key={activeSrc}
      className="j-gallery-video-frame"
      src={`${activeSrc}#t=0.001`}
      preload="metadata"
      muted
      playsInline
      aria-label={alt}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setCachedVideoAspect(activeSrc, video.videoWidth, video.videoHeight);
        }
      }}
      onLoadedData={(event) => {
        const video = event.currentTarget;
        if (video.currentTime === 0) {
          try {
            video.currentTime = 0.001;
          } catch {
            /* seek khi metadata sẵn sàng */
          }
        }
      }}
      onError={() => {
        setCandidateIndex((index) => index + 1);
      }}
    />
  );
}

/** Thumbnail gallery — ảnh CF, Bunny thumb, frame đầu video, hoặc placeholder. */
export function GalleryItemVisual({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  priority,
  isVideo,
  videoProcessing,
  videoPreviewSrc,
  objectPosition,
  zoom,
}: Props) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const previewSrc = videoPreviewSrc?.trim() || null;
  const thumbSrc = src.trim();

  useEffect(() => {
    setThumbFailed(false);
  }, [thumbSrc, previewSrc]);

  const showVideoFrame =
    Boolean(previewSrc) && isVideo && (!thumbSrc || thumbFailed);

  if (showVideoFrame && previewSrc) {
    return (
      <GalleryVideoFrameThumb
        src={previewSrc}
        alt={alt}
      />
    );
  }

  if (thumbSrc) {
    return (
      <JourneyCoverImage
        src={thumbSrc}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        priority={priority}
        objectPosition={objectPosition}
        zoom={zoom}
        onFinalError={
          previewSrc && isVideo ? () => setThumbFailed(true) : undefined
        }
      />
    );
  }

  if (isVideo) {
    return (
      <span className="j-gallery-video-ph" aria-hidden>
        {videoProcessing ? "Đang xử lý" : "Video"}
      </span>
    );
  }

  return null;
}

export function GalleryVideoPlayBadge() {
  return (
    <span className="j-g-play" aria-hidden>
      <Play strokeWidth={2.2} fill="currentColor" />
    </span>
  );
}

/** Logo nền tảng nhúng — góc trên phải thumbnail gallery. */
export function GalleryEmbedPlatformBadge({
  provider,
}: {
  provider: EmbedProviderId | null | undefined;
}) {
  const src = embedPlatformLogoSrc(provider);
  if (!src) return null;
  return (
    <span className="j-g-embed-platform" aria-hidden>
      <img src={src} alt="" width={20} height={20} decoding="async" />
    </span>
  );
}
