import type { Block } from "@/lib/editor/types";

/** Tỉ lệ khung canvas mặc định theo hướng video upload. */
export type VideoCanvasRatio = "16:9" | "1:1" | "3:4" | "9:16";

/** Hướng video — suy từ `videoCanvasRatio` trên block embed. */
export type VideoOrientation = "portrait" | "landscape" | "square";

const SQUARE_TOLERANCE = 0.08;
/**
 * Ngưỡng bucket class `9:16` — cao hơn 9:16.
 * Clamp thật theo breakpoint nằm ở CSS (`max(--media-natural-aspect, …)`).
 */
export const VIDEO_PORTRAIT_MAX_HW = 16 / 9;
/** Khung video trên feed/timeline — không cao hơn 6:7. */
export const VIDEO_FEED_MAX_ASPECT = 6 / 7;

export function resolveVideoCanvasRatio(
  width: number,
  height: number,
): VideoCanvasRatio {
  if (width <= 0 || height <= 0) return "16:9";
  const aspect = width / height;
  if (Math.abs(aspect - 1) <= SQUARE_TOLERANCE) return "1:1";
  if (width > height) return "16:9";
  if (height / width > VIDEO_PORTRAIT_MAX_HW) return "9:16";
  return "3:4";
}

/** Tỉ lệ thật width/height — không clamp; CSS media query clamp theo breakpoint. */
export function videoNaturalAspect(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 16 / 9;
  return width / height;
}

/** @deprecated Dùng videoNaturalAspect + CSS clamp responsive. */
export function clampVideoCanvasAspect(width: number, height: number): number {
  return videoNaturalAspect(width, height);
}

/** Fallback aspect khi chỉ có bucket ratio (chưa probe được kích thước). */
export function canvasAspectFromRatio(
  ratio: VideoCanvasRatio | null | undefined,
): number {
  switch (ratio) {
    case "9:16":
      return 9 / 16;
    case "3:4":
      return 3 / 4;
    case "1:1":
      return 1;
    case "16:9":
    default:
      return 16 / 9;
  }
}

export function probeVideoFileDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được kích thước video."));
    };
    video.src = url;
  });
}

export async function probeVideoFileCanvasRatio(
  file: File,
): Promise<VideoCanvasRatio> {
  try {
    const { width, height } = await probeVideoFileDimensions(file);
    return resolveVideoCanvasRatio(width, height);
  } catch {
    return "16:9";
  }
}

export function parseVideoCanvasRatio(
  value: unknown,
): VideoCanvasRatio | null {
  if (value === "16:9" || value === "1:1" || value === "3:4" || value === "9:16") {
    return value;
  }
  return null;
}

export function extractVideoCanvasRatio(
  blocks: ReadonlyArray<Block> | null | undefined,
): VideoCanvasRatio | null {
  if (!blocks?.length) return null;
  let fallback: VideoCanvasRatio | null = null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const ratio = parseVideoCanvasRatio(block.config?.videoCanvasRatio);
    if (!ratio) continue;
    const cfg = block.config ?? {};
    const provider =
      typeof cfg.videoProvider === "string" ? cfg.videoProvider.trim() : "";
    const videoId =
      (typeof cfg.videoId === "string" ? cfg.videoId.trim() : "") ||
      (typeof cfg.bunnyVideoId === "string" ? cfg.bunnyVideoId.trim() : "");
    /* Ưu tiên embed Stream upload — bỏ qua embed phụ không có ratio. */
    if (provider === "stream" || videoId) return ratio;
    if (!fallback) fallback = ratio;
  }
  return fallback;
}

export function videoOrientationFromCanvasRatio(
  ratio: VideoCanvasRatio | null | undefined,
): VideoOrientation | null {
  switch (ratio) {
    case "9:16":
    case "3:4":
      return "portrait";
    case "16:9":
      return "landscape";
    case "1:1":
      return "square";
    default:
      return null;
  }
}

export function isPortraitVideoOrientation(
  orientation: VideoOrientation | null | undefined,
): boolean {
  return orientation === "portrait";
}

/** Embed video đầu tiên — dọc / ngang / vuông (null khi chưa có ratio). */
export function extractVideoOrientationFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): VideoOrientation | null {
  return videoOrientationFromCanvasRatio(extractVideoCanvasRatio(blocks));
}

/** Kích thước gợi ý cho poster video (intrinsic width/height). */
export function videoPreviewDimensionsFromRatio(
  ratio: VideoCanvasRatio | null | undefined,
): { width: number; height: number } {
  if (ratio === "9:16") return { width: 405, height: 720 };
  if (ratio === "3:4") return { width: 720, height: 960 };
  if (ratio === "1:1") return { width: 720, height: 720 };
  return { width: 1280, height: 720 };
}

export function videoCanvasRatioClass(
  ratio: VideoCanvasRatio | null | undefined,
): string {
  const resolved = ratio ?? "16:9";
  return `is-canvas-${resolved.replace(":", "-")}`;
}
