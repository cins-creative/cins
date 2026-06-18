import type { Block } from "@/lib/editor/types";
import {
  resolveImageSeedLightboxUrl,
  resolveImageSeedThumbUrl,
} from "@/lib/editor/resolve-image-seed-url";
import { detectMediaPostKind } from "@/lib/journey/post-media";

export type GridImage = {
  id: string;
  width: number;
  height: number;
  /** Blob / URL preview khi đang compose (ưu tiên hơn Cloudflare id). */
  previewSrc?: string;
};

export type BlockRenderGroup =
  | { type: "image_grid"; images: GridImage[] }
  | { type: "block"; block: Block };

export const GRID_IMAGE_DEFAULT_WIDTH = 1200;
export const GRID_IMAGE_DEFAULT_HEIGHT = 800;

function isMosaicImgsBlock(block: Block): boolean {
  return block.loai === "imgs" && block.config?.layout === "mosaic";
}

/** Trích ảnh từ block `imgs` thường (không mosaic). */
export function extractImagesFromImgsBlock(block: Block): GridImage[] {
  if (block.loai !== "imgs" || isMosaicImgsBlock(block)) return [];
  const cfg = block.config || {};
  const raw = Array.isArray(cfg.imgs) ? cfg.imgs : [];
  const width =
    typeof cfg.width === "number" && cfg.width > 0
      ? Math.round(cfg.width)
      : GRID_IMAGE_DEFAULT_WIDTH;
  const height =
    typeof cfg.height === "number" && cfg.height > 0
      ? Math.round(cfg.height)
      : GRID_IMAGE_DEFAULT_HEIGHT;

  return raw
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((id) => ({ id: id.trim(), width, height }));
}

/** Gom các block `imgs` liên tiếp — logic render-time theo brief Facebook grid. */
export function groupBlocksForRender(
  blocks: ReadonlyArray<Block>,
): BlockRenderGroup[] {
  const groups: BlockRenderGroup[] = [];
  let imageBuffer: GridImage[] = [];

  const flushImages = () => {
    if (imageBuffer.length === 0) return;
    groups.push({ type: "image_grid", images: imageBuffer });
    imageBuffer = [];
  };

  for (const block of blocks) {
    const extracted = extractImagesFromImgsBlock(block);
    if (extracted.length > 0) {
      imageBuffer.push(...extracted);
      continue;
    }

    flushImages();

    if (block.loai === "imgs" && isMosaicImgsBlock(block)) {
      groups.push({ type: "block", block });
      continue;
    }

    if (block.loai === "imgs") {
      continue;
    }

    groups.push({ type: "block", block });
  }

  flushImages();
  return groups;
}

/** Ảnh album (Facebook grid) từ blocks — null nếu không phải bài ảnh. */
export function photoGridImagesFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): GridImage[] | null {
  if (!blocks?.length || detectMediaPostKind(blocks) !== "photo") return null;
  const all: GridImage[] = [];
  for (const group of groupBlocksForRender(blocks)) {
    if (group.type === "image_grid") all.push(...group.images);
  }
  return all.length > 0 ? all : null;
}

/** Số ô hiển thị — feed tối đa 6 (ô 6 phủ +N khi >6). */
export function albumGridDisplayCount(
  total: number,
  showAll = false,
): number {
  if (total <= 0) return 0;
  if (showAll) return total;
  return Math.min(total, 6);
}

/** Overlay +N trên ô cuối khi album có hơn 6 ảnh (chế độ xem). */
export function albumGridRemainingCount(
  total: number,
  showAll = false,
): number {
  if (showAll || total <= 6) return 0;
  return total - 6;
}

/** `data-count` cho CSS — layout demo: 1–6; 7+ xem = 6; compose = số thật. */
export function albumGridLayoutCount(
  total: number,
  showAll = false,
): number {
  if (total <= 0) return 0;
  if (showAll) return total;
  return total >= 7 ? 6 : total;
}

export function isPortraitGridImage(image: GridImage): boolean {
  return image.height > image.width;
}

/** @deprecated Dùng `albumGridDisplayCount`. */
export function facebookGridDisplayCount(total: number): number {
  return albumGridDisplayCount(total);
}

/** @deprecated Dùng `albumGridRemainingCount`. */
export function facebookGridRemainingCount(total: number): number {
  return albumGridRemainingCount(total);
}

/** Chia slot theo hàng (compose 7–10: hàng 3 cột). */
export function albumGridComposeRows(slotCount: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < slotCount; i += 3) {
    const row: number[] = [];
    for (let j = i; j < Math.min(i + 3, slotCount); j++) row.push(j);
    rows.push(row);
  }
  return rows;
}

/** Thumbnail grid — variant nhỏ; compose dùng previewSrc (blob / URL upload) trước CF id. */
export function gridThumbSrc(image: GridImage): string {
  const preview = image.previewSrc?.trim();
  if (preview) return preview;
  return resolveImageSeedThumbUrl(image.id, image.width, image.height);
}

/** Lightbox — variant lớn, giữ ratio gốc. */
export function gridLightboxSrc(image: GridImage): string {
  const preview = image.previewSrc?.trim();
  if (preview) return preview;
  return resolveImageSeedLightboxUrl(image.id, image.width, image.height);
}
