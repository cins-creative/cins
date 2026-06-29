import type { Block } from "@/lib/editor/types";
import {
  photoGridImagesFromBlocks,
  type GridImage,
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
} from "@/lib/journey/image-grid";
import {
  blocksAreMediaCaptionOnly,
  blocksAreTextPanelOnly,
  detectMediaPostKind,
  extractAllImageIds,
  hasArticleLayoutBlocks,
} from "@/lib/journey/post-media";

export type MilestoneCardContentKind = "photo" | "video" | "article" | "text";

export type MilestonePhotoLayout = "single" | "album";

/**
 * Loại card timeline — quy tắc cover & layout:
 * - cover_id tuỳ chọn → Gallery thumb + cover bài viết dài (article).
 * - Video → luôn video (cover = frame/thumbnail tuỳ chọn).
 * - 1 ảnh + caption → photo (lightbox).
 * - Album ≥2 ảnh, caption-only → photo album (grid từ blocks, không hero cover).
 * - Chỉ chữ (body/h2/h3/quote) → text panel.
 * - Ảnh inline + chữ / palette / cover bài → article (unfold).
 */
export function milestoneCardContentKind(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
  _body: string | null | undefined = null,
): MilestoneCardContentKind {
  const parsed = blocks ?? [];
  const mediaKind = detectMediaPostKind(parsed);
  const imageCount = extractAllImageIds(parsed).length;

  if (mediaKind === "video") return "video";
  if (mediaKind === "photo") return "photo";

  // Chỉ chữ — không ảnh thật trong blocks (không suy ra từ preview media).
  if (imageCount === 0 && blocksAreTextPanelOnly(parsed)) {
    return "text";
  }

  if (imageCount >= 1 && blocksAreMediaCaptionOnly(parsed)) {
    return "photo";
  }

  if (hasArticleLayoutBlocks(parsed)) return "article";

  if (imageCount > 0 && !blocksAreMediaCaptionOnly(parsed)) {
    return "article";
  }

  if (hasCoverPreview && imageCount === 0 && !blocksAreTextPanelOnly(parsed)) {
    return "article";
  }

  if (imageCount === 0) {
    return "text";
  }

  return "article";
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
  return imageCount <= 1 ? "single" : "album";
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
