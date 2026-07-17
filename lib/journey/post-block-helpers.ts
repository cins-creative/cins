import type { Block } from "@/lib/editor/types";
import { isPersistedImageSeed } from "@/lib/truong/image-ref";

export type GalleryMediaKind = "article" | "photo" | "video" | "embed";

/** Trích id ảnh theo thứ tự block — mỗi block `imgs` thường 1 ảnh. */
export function extractPhotoImageIds(blocks: ReadonlyArray<Block>): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    if (block.loai !== "imgs" || block.config?.layout === "mosaic") continue;
    const raw = block.config?.imgs;
    if (!Array.isArray(raw)) continue;
    for (const id of raw) {
      if (typeof id === "string" && isPersistedImageSeed(id)) ids.push(id.trim());
    }
  }
  return ids;
}

/** Mọi ảnh trong blocks (album hoặc ảnh inline trong bài viết). */
export function extractAllImageIds(
  blocks: ReadonlyArray<Block> | null | undefined,
): string[] {
  if (!blocks?.length) return [];
  return extractPhotoImageIds(blocks);
}

/** Chỉ caption + album — không heading/quote/… */
export function blocksAreMediaCaptionOnly(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  if (!blocks?.length) return true;
  return blocks.every(
    (b) => b.loai === "body" || b.loai === "spacer" || b.loai === "imgs",
  );
}

/** Chỉ block chữ (body/h2/h3/quote/spacer) — không media, không layout bài viết. */
export function blocksArePlainTextOnly(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  if (!blocks?.length) return true;
  return blocks.every(
    (b) =>
      b.loai === "body" ||
      b.loai === "spacer" ||
      b.loai === "h2" ||
      b.loai === "h3" ||
      b.loai === "quote",
  );
}

/** Block layout bài viết dài (palette, mosaic, divider) — không dùng text panel. */
export function hasArticleLayoutBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  if (!blocks?.length) return false;
  return blocks.some(
    (b) =>
      b.loai === "palette" ||
      b.loai === "divider" ||
      (b.loai === "imgs" && b.config?.layout === "mosaic"),
  );
}

/** Có cấu trúc prose bài viết (h2/h3/quote) — không phải caption album thuần. */
export function hasArticleProseStructure(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  if (!blocks?.length) return false;
  return blocks.some(
    (b) => b.loai === "h2" || b.loai === "h3" || b.loai === "quote",
  );
}
