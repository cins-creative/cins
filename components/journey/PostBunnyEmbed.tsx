"use client";

import { JourneyDetailBunnyVideo } from "@/components/journey/BunnyNativeVideoPlayer";
import type { Block } from "@/lib/editor/types";
import { buildBunnyVideoThumbnailUrl } from "@/lib/bunny/embed";
import { useResolvedVideoCanvas } from "@/lib/journey/use-resolved-video-canvas-ratio";
import { videoCanvasRatioClass } from "@/lib/journey/video-canvas-ratio";

type Props = {
  videoId: string;
  title?: string;
  poster?: string | null;
  blocks?: ReadonlyArray<Block> | null;
  autoplay?: boolean;
};

/** Bunny embed trong post view — resolve canvas từ block meta hoặc probe MP4. */
export function PostBunnyEmbed({
  videoId,
  title = "Video",
  poster = null,
  blocks = null,
  autoplay = false,
}: Props) {
  const { ratio, aspect } = useResolvedVideoCanvas(blocks ?? undefined, videoId);
  const canvasClass = videoCanvasRatioClass(ratio);
  const canvasStyle = {
    ["--media-natural-aspect" as string]: String(aspect),
  };
  const thumb =
    poster ??
    buildBunnyVideoThumbnailUrl(videoId) ??
    null;

  return (
    <JourneyDetailBunnyVideo
      videoId={videoId}
      title={title}
      poster={thumb}
      canvasClass={canvasClass}
      canvasStyle={canvasStyle}
      autoplay={autoplay}
    />
  );
}
