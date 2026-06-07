import type { Block } from "@/lib/editor/types";
import {
  photoGridImagesFromBlocks,
  type GridImage,
} from "@/lib/journey/image-grid";
import { detectMediaPostKind } from "@/lib/journey/post-media";

export type MilestoneCardContentKind = "photo" | "video" | "article";

/** Loại card timeline — chỉ từ `noiDungBlocks`, khớp `JourneyMilestoneCard`. */
export function milestoneCardContentKind(
  blocks: ReadonlyArray<Block> | null | undefined,
): MilestoneCardContentKind {
  const mediaKind = detectMediaPostKind(blocks);
  const photoGridImages = photoGridImagesFromBlocks(blocks);
  if (mediaKind === "photo" && photoGridImages) return "photo";
  if (mediaKind === "video") return "video";
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
): boolean {
  return milestoneCardContentKind(blocks) === "article";
}
