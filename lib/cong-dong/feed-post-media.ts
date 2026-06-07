import type { Block } from "@/lib/editor/types";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  photoGridImagesFromBlocks,
  type GridImage,
} from "@/lib/journey/image-grid";
import { detectMediaPostKind, extractPhotoImageIds } from "@/lib/journey/post-media";

function toGridImages(ids: string[]): GridImage[] {
  return ids.map((id) => ({
    id,
    width: GRID_IMAGE_DEFAULT_WIDTH,
    height: GRID_IMAGE_DEFAULT_HEIGHT,
  }));
}

/** Ảnh album — gom mọi block `imgs` + media junction (giống Journey card). */
export function congDongMirrorPhotoGrid(
  blocks: ReadonlyArray<Block> | null | undefined,
  extraCloudflareIds: string[] = [],
): GridImage[] | null {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const id = raw.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };

  for (const id of extractPhotoImageIds(blocks ?? [])) push(id);

  const fromGroups = photoGridImagesFromBlocks(blocks);
  if (fromGroups) {
    for (const img of fromGroups) push(img.id);
  }

  for (const id of extraCloudflareIds) push(id);

  return ordered.length > 0 ? toGridImages(ordered) : null;
}

export function congDongMirrorIsPhotoAlbum(
  blocks: ReadonlyArray<Block> | null | undefined,
  extraCloudflareIds: string[] = [],
): boolean {
  if (detectMediaPostKind(blocks) === "video") return false;
  const grid = congDongMirrorPhotoGrid(blocks, extraCloudflareIds);
  return Boolean(grid && grid.length > 0);
}
