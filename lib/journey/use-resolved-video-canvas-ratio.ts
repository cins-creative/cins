"use client";

import { useEffect, useState } from "react";

import type { Block } from "@/lib/editor/types";
import { buildStreamMp4Url } from "@/lib/cloudflare/stream-embed";
import { probeRemoteVideoDimensions } from "@/lib/journey/probe-remote-video-dimensions";
import {
  canvasAspectFromRatio,
  extractVideoCanvasRatio,
  resolveVideoCanvasRatio,
  videoNaturalAspect,
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";

export type ResolvedVideoCanvas = {
  ratio: VideoCanvasRatio;
  /** CSS `--media-natural-aspect` (width/height), chưa clamp — CSS media query clamp. */
  aspect: number;
};

/**
 * Tỉ lệ khung video trên card — ưu tiên kích thước MP4 thật (probe),
 * không có thì meta block. Clamp cao tối đa: desktop 3:4 · mobile 9:16 (CSS).
 */
export function useResolvedVideoCanvas(
  blocks: ReadonlyArray<Block> | null | undefined,
  videoId: string | null | undefined,
): ResolvedVideoCanvas {
  const fromBlocks = extractVideoCanvasRatio(blocks);
  const [probed, setProbed] = useState<ResolvedVideoCanvas | null>(null);

  useEffect(() => {
    const id = videoId?.trim();
    if (!id) {
      setProbed(null);
      return;
    }

    let cancelled = false;
    const mp4 = buildStreamMp4Url(id);
    if (!mp4) return;

    void probeRemoteVideoDimensions(mp4).then((dim) => {
      if (cancelled || !dim) return;
      setProbed({
        ratio: resolveVideoCanvasRatio(dim.width, dim.height),
        aspect: videoNaturalAspect(dim.width, dim.height),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  if (probed) return probed;

  const ratio = fromBlocks ?? "16:9";
  return { ratio, aspect: canvasAspectFromRatio(ratio) };
}

/** @deprecated Dùng `useResolvedVideoCanvas` — giữ alias cho chỗ chỉ cần bucket ratio. */
export function useResolvedVideoCanvasRatio(
  blocks: ReadonlyArray<Block> | null | undefined,
  videoId: string | null | undefined,
): VideoCanvasRatio {
  return useResolvedVideoCanvas(blocks, videoId).ratio;
}
