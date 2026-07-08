import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import type { VideoCanvasRatio } from "@/lib/journey/video-canvas-ratio";

export function isGalleryVideoItem(
  item: Pick<GalleryMainItem, "isVideo" | "mediaKind">,
): boolean {
  return Boolean(item.isVideo || item.mediaKind === "video");
}

export function isPortraitVideoDimensions(width: number, height: number): boolean {
  return width > 0 && height > 0 && width < height;
}

export function portraitAspectFromCanvasRatio(
  ratio: VideoCanvasRatio | null | undefined,
): number | null {
  switch (ratio) {
    case "9:16":
      return 9 / 16;
    case "3:4":
      return 3 / 4;
    case "1:1":
      return 1;
    case "16:9":
      return 16 / 9;
    default:
      return null;
  }
}

/** Gợi ý sớm từ block upload — probe Bunny sẽ xác nhận lại. */
export function isLikelyPortraitGalleryVideo(
  item: Pick<
    GalleryMainItem,
    "videoCanvasRatio" | "width" | "height" | "isVideo" | "mediaKind"
  >,
): boolean {
  if (!isGalleryVideoItem(item)) return false;
  if (item.videoCanvasRatio === "3:4" || item.videoCanvasRatio === "9:16") {
    return true;
  }
  if (item.videoCanvasRatio === "16:9" || item.videoCanvasRatio === "1:1") {
    return false;
  }
  const w = item.width ?? 0;
  const h = item.height ?? 0;
  if (w === 800 && h === 450) return false;
  return isPortraitVideoDimensions(w, h);
}
