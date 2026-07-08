"use client";

import { useEffect, useState } from "react";

import type { Block } from "@/lib/editor/types";
import { BUNNY_FEED_QUALITY } from "@/lib/journey/bunny-video-playback";
import { probeRemoteVideoDimensions } from "@/lib/journey/probe-remote-video-dimensions";
import {
  extractVideoCanvasRatio,
  resolveVideoCanvasRatio,
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";
import { buildBunnyVideoMp4Url } from "@/lib/bunny/embed";

/**
 * Tỉ lệ khung video trên card — ưu tiên block meta, không có thì probe MP4 Bunny.
 */
export function useResolvedVideoCanvasRatio(
  blocks: ReadonlyArray<Block> | null | undefined,
  bunnyVideoId: string | null | undefined,
): VideoCanvasRatio {
  const fromBlocks = extractVideoCanvasRatio(blocks);
  const [probed, setProbed] = useState<VideoCanvasRatio | null>(null);

  useEffect(() => {
    if (fromBlocks) {
      setProbed(null);
      return;
    }
    const id = bunnyVideoId?.trim();
    if (!id) return;

    let cancelled = false;
    const mp4 = buildBunnyVideoMp4Url(id, BUNNY_FEED_QUALITY);
    if (!mp4) return;

    void probeRemoteVideoDimensions(mp4).then((dim) => {
      if (cancelled || !dim) return;
      setProbed(resolveVideoCanvasRatio(dim.width, dim.height));
    });

    return () => {
      cancelled = true;
    };
  }, [fromBlocks, bunnyVideoId]);

  // Probe MP4 khi có — ưu tiên kích thước thật (sửa meta 3:4 sai với video 9:16).
  return probed ?? fromBlocks ?? "16:9";
}
