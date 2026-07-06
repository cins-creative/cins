import type { Block } from "@/lib/editor/types";
import {
  photoGridImagesFromBlocks,
  type GridImage,
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
} from "@/lib/journey/image-grid";
import {
  postDisplayKindToMilestoneCardKind,
  resolvePostDisplayKind,
} from "@/lib/journey/post-content-kind";
import { extractAllImageIds } from "@/lib/journey/post-media";

export type MilestoneCardContentKind = "photo" | "video" | "article" | "text";

export type MilestonePhotoLayout = "single" | "album";

/**
 * Loại card timeline — delegate `lib/journey/post-content-kind.ts` (Phase 1).
 */
export function milestoneCardContentKind(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
  body: string | null | undefined = null,
): MilestoneCardContentKind {
  const kind = resolvePostDisplayKind({
    moTa: body,
    hasCover: hasCoverPreview,
    blocks: blocks ?? [],
  }).kind;

  return postDisplayKindToMilestoneCardKind(kind);
}

export function milestonePhotoLayout(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
  body: string | null | undefined = null,
): MilestonePhotoLayout | null {
  if (milestoneCardContentKind(blocks, hasCoverPreview, body) !== "photo") {
    return null;
  }
  const imageCount = extractAllImageIds(blocks).length;
  const hasCoverOnly =
    hasCoverPreview && imageCount === 0 ? 1 : imageCount;
  return hasCoverOnly <= 1 ? "single" : "album";
}

export function milestoneCardPhotoGrid(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
  body: string | null | undefined = null,
): GridImage[] | null {
  if (milestoneCardContentKind(blocks, hasCoverPreview, body) !== "photo") {
    return null;
  }

  const fromAlbum = photoGridImagesFromBlocks(blocks);
  if (fromAlbum && fromAlbum.length > 0) return fromAlbum;

  const ids = extractAllImageIds(blocks);
  if (ids.length === 0) return null;

  return ids.map((id) => ({
    id,
    width: GRID_IMAGE_DEFAULT_WIDTH,
    height: GRID_IMAGE_DEFAULT_HEIGHT,
  }));
}

export function isMilestoneArticleCard(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
  body: string | null | undefined = null,
): boolean {
  return milestoneCardContentKind(blocks, hasCoverPreview, body) === "article";
}

export function isMilestoneTextCard(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
  body: string | null | undefined = null,
): boolean {
  return milestoneCardContentKind(blocks, hasCoverPreview, body) === "text";
}

export {
  resolveTextPanelTone,
  textPanelToneClass,
  textPanelUsesLightInk,
} from "@/lib/journey/text-panel-tone";
