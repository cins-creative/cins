import type { Block } from "@/lib/editor/types";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  type GridImage,
} from "@/lib/journey/image-grid";
import {
  milestoneCardContentKind,
  milestoneCardPhotoGrid,
} from "@/lib/journey/milestone-card-kind";

function toGridImages(ids: string[]): GridImage[] {
  return ids.map((id) => ({
    id,
    width: GRID_IMAGE_DEFAULT_WIDTH,
    height: GRID_IMAGE_DEFAULT_HEIGHT,
  }));
}

/** Ảnh album từ blocks — khớp Journey card. */
export function congDongMirrorPhotoGrid(
  blocks: ReadonlyArray<Block> | null | undefined,
  extraCloudflareIds: string[] = [],
): GridImage[] | null {
  const fromBlocks = milestoneCardPhotoGrid(blocks);
  if (fromBlocks) return fromBlocks;

  const ordered = extraCloudflareIds.map((id) => id.trim()).filter(Boolean);
  return ordered.length > 0 ? toGridImages(ordered) : null;
}

export function congDongMirrorIsPhotoAlbum(
  blocks: ReadonlyArray<Block> | null | undefined,
  _extraCloudflareIds: string[] = [],
): boolean {
  return milestoneCardContentKind(blocks) === "photo";
}
