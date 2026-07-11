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

/** Chia cells vào các cột Masonry cân bằng (cột "thấp" nhất nhận ảnh kế). */
function packMasonryColumns(cells: AlbumCell[], columns: number): AlbumCell[][] {
  const cols: AlbumCell[][] = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);
  for (const cell of cells) {
    let target = 0;
    for (let c = 1; c < columns; c++) {
      if (heights[c] < heights[target]) target = c;
    }
    cols[target].push(cell);
    // Chiều cao tương đối của ảnh khi bề rộng cột = 1 là 1/aspect.
    heights[target] += 1 / (cell.aspect || 1);
  }
  return cols.filter((col) => col.length > 0);
}

/** Chia cells thành các hàng Justified (tối đa JUSTIFIED_MAX_PER_ROW / hàng). */
function splitJustifiedRows(cells: AlbumCell[]): AlbumCell[][] {
  // 4 ảnh: 2×2 cân bằng — tránh hàng 3+1 lệch.
  if (cells.length === 4) {
    return [cells.slice(0, 2), cells.slice(2, 4)];
  }
  const rows: AlbumCell[][] = [];
  for (let i = 0; i < cells.length; i += JUSTIFIED_MAX_PER_ROW) {
    rows.push(cells.slice(i, i + JUSTIFIED_MAX_PER_ROW));
  }
  return rows;
}

/**
 * Chọn layout album theo hướng ảnh (brief no-crop):
 * - 1 ảnh: giữ tỉ lệ gốc (single)
 * - toàn ảnh vuông: grid vuông
 * - gần như toàn ảnh dọc: Masonry dọc
 * - còn lại (ngang / trộn): Justified Grid (4 ảnh → 2×2)
 *
 * >6 ảnh (chế độ xem): vẫn chọn layout theo hướng ảnh như trên nhưng chỉ hiện
 * 6 ô đầu, ô cuối phủ overlay "+N" (N = số ảnh còn lại). Trước đây >6 luôn ép
 * về grid vuông → ảnh ngang bị nhốt trong ô vuông; nay tôn trọng hướng ảnh.
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

  const squareLayout = (): AlbumLayout => ({
    kind: "square",
    layoutCount: albumGridLayoutCount(total, showAll),
    displayImages,
    remaining,
    overlaySlotIndex,
  });

  // Phân loại hướng theo đúng số ảnh sẽ hiện (6 ô đầu khi >6).
  const orientations = displayImages.map(classifyGridImage);
  const portraitCount = orientations.filter((o) => o === "portrait").length;
  const landscapeCount = orientations.filter((o) => o === "landscape").length;
  const squareCount = orientations.filter((o) => o === "square").length;

  if (squareCount === displayCount) return squareLayout();

  const cells = displayImages.map(toCell);

  const portraitDominant =
    landscapeCount === 0 &&
    portraitCount / displayCount >= MASONRY_MIN_PORTRAIT_SHARE;

  if (portraitDominant) {
    const columns = Math.min(MASONRY_MAX_COLUMNS, displayCount);
    return {
      kind: "masonry",
      columns: packMasonryColumns(cells, columns),
      remaining,
      overlaySlotIndex,
    };
  }

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
