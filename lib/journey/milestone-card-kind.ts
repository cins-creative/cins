import type { Block } from "@/lib/editor/types";
import { inferComposePreviewKind } from "@/lib/journey/compose-preview-kind";
import {
  photoGridImagesFromBlocks,
  type GridImage,
} from "@/lib/journey/image-grid";
import {
  blocksAreCaptionOnly,
  detectMediaPostKind,
} from "@/lib/journey/post-media";

export type MilestoneCardContentKind = "photo" | "video" | "article" | "text";

/** Loại card timeline — blocks + có/không ảnh bìa preview, khớp `JourneyMilestoneCard`. */
export function milestoneCardContentKind(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
): MilestoneCardContentKind {
  const mediaKind = detectMediaPostKind(blocks);
  const photoGridImages = photoGridImagesFromBlocks(blocks);
  if (mediaKind === "photo" && photoGridImages) {
    // Bài viết có ảnh bìa + block phong phú (body + imgs…) — card bài viết, không album full grid.
    if (hasCoverPreview && blocks && !blocksAreCaptionOnly(blocks)) {
      return "article";
    }
    return "photo";
  }
  if (mediaKind === "video") return "video";
  if (hasCoverPreview && blocksAreCaptionOnly(blocks)) return "photo";
  if (
    !hasCoverPreview &&
    inferComposePreviewKind(blocks ? [...blocks] : [], null) === "text"
  ) {
    return "text";
  }
  return "article";
}

export function milestoneCardPhotoGrid(
  blocks: ReadonlyArray<Block> | null | undefined,
): GridImage[] | null {
  if (milestoneCardContentKind(blocks) !== "photo") return null;
  return photoGridImagesFromBlocks(blocks);
}

export function isMilestoneArticleCard(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
): boolean {
  return milestoneCardContentKind(blocks, hasCoverPreview) === "article";
}

export function isMilestoneTextCard(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
): boolean {
  return milestoneCardContentKind(blocks, hasCoverPreview) === "text";
}

export {
  resolveTextPanelTone,
  textPanelToneClass,
  textPanelUsesLightInk,
} from "@/lib/journey/text-panel-tone";
