"use client";

import type { Rive } from "@rive-app/canvas";
import { Alignment, Fit, Layout } from "@rive-app/canvas";
import { useRive } from "@rive-app/react-canvas";

/** Layout mặc định cho embed .riv trong bài viết / compose. */
export const RIVE_EMBED_LAYOUT = new Layout({
  fit: Fit.Contain,
  alignment: Alignment.Center,
});

/** Timeline card peek — lấp đầy khung media, có thể crop (chỉ khi gọi rõ `cover`). */
export const RIVE_CARD_PEEK_LAYOUT = new Layout({
  fit: Fit.Cover,
  alignment: Alignment.Center,
});

export type RiveEmbedFit = "contain" | "cover" | "native";

/** Tỉ lệ artboard gốc trong file .riv — dùng resize khung peek. */
export function readRiveArtboardAspectRatio(rive: Rive): number | null {
  rive.resetArtboardSize();
  const w = rive.artboardWidth;
  const h = rive.artboardHeight;
  if (w > 0 && h > 0) return w / h;

  const bounds = rive.bounds;
  if (bounds) {
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    if (bw > 0 && bh > 0) return bw / bh;
  }

  return null;
}

/**
 * File .riv thường có cả timeline lẫn state machine.
 * Runtime mặc định (`autoplay` không chỉ SM) hay chọn timeline trước → mất hover/click.
 * Luôn ưu tiên chạy state machine khi có.
 */
export function startInteractiveRivePlayback(rive: Rive): void {
  const stateMachineNames = rive.stateMachineNames;
  if (stateMachineNames.length > 0) {
    for (const animationName of rive.animationNames) {
      rive.stop(animationName);
    }
    for (const smName of stateMachineNames) {
      rive.play(smName);
    }
  } else {
    const animationNames = rive.animationNames;
    if (animationNames.length > 0) {
      rive.play(animationNames[0]!);
    }
  }

  rive.resizeToCanvas();
  rive.startRendering();
}

export function useInteractiveRiveEmbed(
  src: string,
  options?: {
    fit?: RiveEmbedFit;
    onArtboardAspectRatio?: (ratio: number) => void;
  },
) {
  const fit = options?.fit ?? "contain";
  const layout =
    fit === "cover" ? RIVE_CARD_PEEK_LAYOUT : RIVE_EMBED_LAYOUT;
  return useRive(
    {
      src,
      layout,
      autoplay: true,
      onRiveReady: (rive) => {
        if (fit === "native") {
          const ratio = readRiveArtboardAspectRatio(rive);
          if (ratio) options?.onArtboardAspectRatio?.(ratio);
        }
        startInteractiveRivePlayback(rive);
      },
    },
    { shouldResizeCanvasToContainer: true },
  );
}
