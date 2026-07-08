import type { Block } from "@/lib/editor/types";

/** Tỉ lệ khung canvas mặc định theo hướng video upload. */
export type VideoCanvasRatio = "16:9" | "1:1" | "3:4" | "9:16";

const SQUARE_TOLERANCE = 0.08;
/** Ngưỡng phân biệt 9:16 (dọc hẹp) vs 3:4 (dọc rộng hơn). */
const TALL_PORTRAIT_MIN = 1.6;

export function resolveVideoCanvasRatio(
  width: number,
  height: number,
): VideoCanvasRatio {
  if (width <= 0 || height <= 0) return "16:9";
  const aspect = width / height;
  if (Math.abs(aspect - 1) <= SQUARE_TOLERANCE) return "1:1";
  if (width > height) return "16:9";
  if (height / width >= TALL_PORTRAIT_MIN) return "9:16";
  return "3:4";
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
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const url =
      typeof block.config?.url === "string" ? block.config.url.trim() : "";
    if (!url) continue;
    return parseVideoCanvasRatio(block.config?.videoCanvasRatio);
  }
  return null;
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
