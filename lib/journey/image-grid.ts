import type { Block } from "@/lib/editor/types";
import {
  resolveImageSeedFeedAsset,
  resolveImageSeedLightboxUrl,
  resolveImageSeedThumbUrl,
  type ImageSeedDeliveryAsset,
} from "@/lib/editor/resolve-image-seed-url";
import { detectMediaPostKind } from "@/lib/journey/post-media";
import { isServerAlbumGridImgBlock } from "@/lib/editor/album-grid-block";
import { isPersistedImageSeed } from "@/lib/truong/image-ref";

export type GridImage = {
  id: string;
  width: number;
  height: number;
  /** Blob / URL preview khi đang compose (ưu tiên hơn Cloudflare id). */
  previewSrc?: string;
  /** Ô album compose chưa có ảnh — không resolve picsum dummy. */
  composePending?: boolean;
};

/** Trạng thái upload từng ô album trong compose overlay. */
export type GridUploadSlotState = {
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
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
    .filter((s): s is string => typeof s === "string" && isPersistedImageSeed(s))
    .map((id) => ({ id: id.trim(), width, height }));
}

/** Gom các block album (`albumGridCell`) liên tiếp — ảnh inline render riêng. */
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
    if (isServerAlbumGridImgBlock(block, blocks)) {
      const extracted = extractImagesFromImgsBlock(block);
      if (extracted.length > 0) {
        imageBuffer.push(...extracted);
        continue;
      }
    }

    flushImages();

    if (block.loai === "imgs" && isMosaicImgsBlock(block)) {
      groups.push({ type: "block", block });
      continue;
    }

    if (block.loai === "imgs") {
      groups.push({ type: "block", block });
      continue;
    }

    groups.push({ type: "block", block });
  }

  flushImages();
  return groups;
}

/** Mọi ảnh persisted trong blocks `imgs` — giữ width/height từng block (album + inline). */
export function extractPhotoGridImagesFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): GridImage[] {
  if (!blocks?.length) return [];
  const all: GridImage[] = [];
  for (const block of blocks) {
    all.push(...extractImagesFromImgsBlock(block));
  }
  return all;
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

/**
 * Canvas dọc tối đa theo breakpoint (width/height):
 * - desktop ≥768px: 3:4
 * - mobile: 9:16
 * Ảnh/video cao hơn ngưỡng → clamp + cover; thấp hơn → giữ tỉ lệ gốc.
 */
export const MEDIA_CANVAS_ASPECT_DESKTOP = 3 / 4;
export const MEDIA_CANVAS_ASPECT_MOBILE = 9 / 16;
/** height/width — cao hơn 3:4 (desktop). */
export const PORTRAIT_CANVAS_MAX_HW_DESKTOP = 4 / 3;
/** height/width — cao hơn 9:16 (mobile). */
export const PORTRAIT_CANVAS_MAX_HW_MOBILE = 16 / 9;

/** @deprecated Dùng PORTRAIT_CANVAS_MAX_HW_MOBILE */
export const PORTRAIT_CANVAS_MAX_HW = PORTRAIT_CANVAS_MAX_HW_MOBILE;

export function mediaNaturalAspect(width: number, height: number): number | null {
  if (!(width > 0 && height > 0)) return null;
  return width / height;
}

/** Cao hơn canvas desktop 3:4 — cần clamp trên desktop. */
export function isTallPortraitGridImage(image: GridImage): boolean {
  if (!(image.height > 0 && image.width > 0)) return false;
  if (!(image.height > image.width)) return false;
  return image.height / image.width > PORTRAIT_CANVAS_MAX_HW_DESKTOP;
}

export function isTallPortraitDimensions(
  width: number,
  height: number,
): boolean {
  if (!(height > 0 && width > 0)) return false;
  if (!(height > width)) return false;
  return height / width > PORTRAIT_CANVAS_MAX_HW_DESKTOP;
}

/* ── Phân loại hướng ảnh cho layout no-crop ──────────────────────── */

export type GridImageOrientation = "portrait" | "landscape" | "square";

/** Dung sai quanh 1:1 để coi là ảnh vuông. */
export const SQUARE_ASPECT_TOLERANCE = 1.05;
/** Tỉ lệ ảnh dọc tối thiểu để cả album chuyển sang Masonry. */
export const MASONRY_MIN_PORTRAIT_SHARE = 0.8;
/** Số cột Masonry tối đa. */
export const MASONRY_MAX_COLUMNS = 3;
/** Số ảnh tối đa trên một hàng Justified. */
export const JUSTIFIED_MAX_PER_ROW = 3;
/**
 * Canvas album không thấp hơn khung 16:9.
 * Với justified row: `rowHeight / containerWidth ≈ 1 / tổng aspect`.
 */
export const JUSTIFIED_MIN_CANVAS_HEIGHT_RATIO = 9 / 16;

/** Aspect ratio = width / height (fallback 1 nếu thiếu số liệu). */
export function gridImageAspect(image: GridImage): number {
  const w = image.width > 0 ? image.width : GRID_IMAGE_DEFAULT_WIDTH;
  const h = image.height > 0 ? image.height : GRID_IMAGE_DEFAULT_HEIGHT;
  return w / h;
}

export function classifyGridImage(image: GridImage): GridImageOrientation {
  const aspect = gridImageAspect(image);
  if (aspect > SQUARE_ASPECT_TOLERANCE) return "landscape";
  if (aspect < 1 / SQUARE_ASPECT_TOLERANCE) return "portrait";
  return "square";
}

/** Một ô trong layout — giữ index gốc để lightbox/overlay hoạt động. */
export type AlbumCell = {
  image: GridImage;
  index: number;
  aspect: number;
};

export type AlbumLayout =
  | { kind: "single"; portrait: boolean; cell: AlbumCell }
  | {
      kind: "square";
      layoutCount: number;
      displayImages: GridImage[];
      remaining: number;
      overlaySlotIndex: number | null;
    }
  | {
      kind: "masonry";
      columns: AlbumCell[][];
      remaining: number;
      overlaySlotIndex: number | null;
    }
  | {
      kind: "justified";
      rows: AlbumCell[][];
      remaining: number;
      overlaySlotIndex: number | null;
    };

function toCell(image: GridImage, index: number): AlbumCell {
  return { image, index, aspect: gridImageAspect(image) };
}

function justifiedRowHeightRatio(cells: AlbumCell[]): number {
  const aspectSum = cells.reduce((sum, cell) => sum + cell.aspect, 0);
  return aspectSum > 0 ? 1 / aspectSum : 1;
}

/** Tách một hàng thành hai phần liên tiếp có tổng aspect cân bằng nhất. */
function splitBalancedJustifiedRow(cells: AlbumCell[]): AlbumCell[][] {
  if (cells.length < 2) return [cells];

  const totalAspect = cells.reduce((sum, cell) => sum + cell.aspect, 0);
  let leftAspect = 0;
  let bestSplit = 1;
  let bestDifference = Number.POSITIVE_INFINITY;

  for (let index = 1; index < cells.length; index++) {
    leftAspect += cells[index - 1]!.aspect;
    const difference = Math.abs(leftAspect - (totalAspect - leftAspect));
    if (difference < bestDifference) {
      bestDifference = difference;
      bestSplit = index;
    }
  }

  return [cells.slice(0, bestSplit), cells.slice(bestSplit)];
}

/** Chia cells thành các hàng Justified (khớp icon editor: 5 → 2+3). */
function splitJustifiedRows(cells: AlbumCell[]): AlbumCell[][] {
  // Một hàng thấp hơn canvas 16:9 → tách hai hàng, tránh album dẹp lép.
  if (
    cells.length <= JUSTIFIED_MAX_PER_ROW &&
    justifiedRowHeightRatio(cells) < JUSTIFIED_MIN_CANVAS_HEIGHT_RATIO
  ) {
    return splitBalancedJustifiedRow(cells);
  }
  // 4 ảnh: 2×2 cân bằng — tránh hàng 3+1 lệch.
  if (cells.length === 4) {
    return [cells.slice(0, 2), cells.slice(2, 4)];
  }
  // 5 ảnh: 2 trên + 3 dưới (khớp pictogram Hàng cân).
  if (cells.length === 5) {
    return [cells.slice(0, 2), cells.slice(2, 5)];
  }
  const rows: AlbumCell[][] = [];
  for (let i = 0; i < cells.length; i += JUSTIFIED_MAX_PER_ROW) {
    rows.push(cells.slice(i, i + JUSTIFIED_MAX_PER_ROW));
  }
  return rows;
}

/**
 * Album nhiều ảnh luôn dùng Justified Grid:
 * - 1 ảnh: giữ tỉ lệ gốc (single)
 * - 2+ ảnh: tự chia hàng cân bằng (4 → 2+2, 5 → 2+3, 6 → 3+3)
 * - >6 ảnh ở feed: hiện 6 ô đầu, ô cuối phủ "+N"
 *
 * Cùng một thuật toán cho mọi hướng ảnh giúp hàng cuối không đổi sang
 * masonry/square hoặc phình cao bất thường.
 */
export function resolveAlbumLayout(
  images: GridImage[],
  showAll = false,
): AlbumLayout {
  const total = images.length;

  if (total === 1) {
    return {
      kind: "single",
      portrait: isPortraitGridImage(images[0]),
      cell: toCell(images[0], 0),
    };
  }

  const displayCount = albumGridDisplayCount(total, showAll);
  const remaining = albumGridRemainingCount(total, showAll);
  const overlaySlotIndex = remaining > 0 ? displayCount - 1 : null;
  const displayImages = images.slice(0, displayCount);
  const cells = displayImages.map(toCell);

  return {
    kind: "justified",
    rows: splitJustifiedRows(cells),
    remaining,
    overlaySlotIndex,
  };
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
  return gridThumbAsset(image).src;
}

export function gridThumbAsset(
  image: GridImage,
  options?: { singlePortrait?: boolean },
): ImageSeedDeliveryAsset {
  const preview = image.previewSrc?.trim();
  if (preview) return { src: preview };
  if (image.composePending) return { src: "" };
  if (options?.singlePortrait && isPortraitGridImage(image)) {
    return resolveImageSeedFeedAsset(image.id, image.width, image.height);
  }
  return {
    src: resolveImageSeedThumbUrl(image.id, image.width, image.height),
  };
}

/** Lightbox — variant lớn, giữ ratio gốc. */
export function gridLightboxSrc(image: GridImage, portrait = false): string {
  const preview = image.previewSrc?.trim();
  if (preview) return preview;
  if (image.composePending) return "";
  return resolveImageSeedLightboxUrl(
    image.id,
    image.width,
    image.height,
    portrait,
  );
}
