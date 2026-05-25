import {
  cropImageInViewport,
  type CropPanState,
  type NaturalSize,
} from "@/lib/images/crop-viewport";

export type CoverCropState = CropPanState;
export type { NaturalSize };

/** Tỷ lệ banner trường ~ 1200×280 */
export const COVER_CROP_VIEWPORT_W = 600;
export const COVER_CROP_VIEWPORT_H = 140;
export const COVER_OUTPUT_W = 1200;
export const COVER_OUTPUT_H = 280;

export async function cropImageToCoverFile(
  imageSrc: string,
  state: CoverCropState,
  natural: NaturalSize,
  fileName = "cover.webp",
): Promise<{ file: File; previewUrl: string }> {
  return cropImageInViewport(
    imageSrc,
    state,
    natural,
    COVER_CROP_VIEWPORT_W,
    COVER_CROP_VIEWPORT_H,
    COVER_OUTPUT_W,
    COVER_OUTPUT_H,
    fileName,
  );
}
