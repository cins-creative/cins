import type { Block } from "@/lib/editor/types";
import {
  resolveImageSeedFeedAsset,
  resolveImageSeedLightboxUrl,
  resolveImageSeedTallUrl,
  resolveImageSeedThumbUrl,
  resolveImageSeedUrl,
  type ImageSeedDeliveryAsset,
} from "@/lib/editor/resolve-image-seed-url";
import {
  albumLayoutModeFromConfig,
  DEFAULT_ALBUM_LAYOUT_MODE,
  normalizeAlbumLayoutMode,
  type AlbumLayoutMode,
} from "@/lib/journey/album-layout-mode";
import { detectMediaPostKind } from "@/lib/journey/post-media";
import { isServerAlbumGridImgBlock } from "@/lib/editor/album-grid-block";
import { flattenMosaicCells } from "@/lib/editor/image-layout";
import { isPersistedImageSeed } from "@/lib/truong/image-ref";

export type { AlbumLayoutMode } from "@/lib/journey/album-layout-mode";

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
  | {
      type: "image_grid";
      images: GridImage[];
      albumLayout: AlbumLayoutMode;
    }
  | { type: "block"; block: Block };

export const GRID_IMAGE_DEFAULT_WIDTH = 1200;
export const GRID_IMAGE_DEFAULT_HEIGHT = 800;

function isMosaicImgsBlock(block: Block): boolean {
  return block.loai === "imgs" && block.config?.layout === "mosaic";
}

/** Có width/height thật từ block — không phải fallback 1200×800. */
export function hasGridImageDimensions(image: Pick<GridImage, "width" | "height">): boolean {
  return image.width > 0 && image.height > 0;
}

/** Trích ảnh từ block `imgs` (kể cả mosaic / cells legacy). */
export function extractImagesFromImgsBlock(block: Block): GridImage[] {
  if (block.loai !== "imgs") return [];
  const cfg = block.config || {};
  /* 0 = chưa biết tỉ lệ. Không giả 1200×800 — justified sẽ đợi đo intrinsic. */
  const width =
    typeof cfg.width === "number" && cfg.width > 0
      ? Math.round(cfg.width)
      : 0;
  const height =
    typeof cfg.height === "number" && cfg.height > 0
      ? Math.round(cfg.height)
      : 0;

  const fromImgs = Array.isArray(cfg.imgs)
    ? cfg.imgs.filter(
        (s): s is string => typeof s === "string" && s.trim().length > 0,
      )
    : [];
  const raw =
    fromImgs.length > 0 ? fromImgs : flattenMosaicCells(cfg.cells);

  return raw
    .map((s) => s.trim())
    .filter((id) => isPersistedImageSeed(id))
    .map((id) => ({ id, width, height }));
}

/** Gom các block album (`albumGridCell`) liên tiếp — ảnh inline render riêng. */
export function groupBlocksForRender(
  blocks: ReadonlyArray<Block>,
): BlockRenderGroup[] {
  const groups: BlockRenderGroup[] = [];
  let imageBuffer: GridImage[] = [];
  let bufferAlbumLayout: AlbumLayoutMode = DEFAULT_ALBUM_LAYOUT_MODE;

  const flushImages = () => {
    if (imageBuffer.length === 0) return;
    groups.push({
      type: "image_grid",
      images: imageBuffer,
      albumLayout: bufferAlbumLayout,
    });
    imageBuffer = [];
    bufferAlbumLayout = DEFAULT_ALBUM_LAYOUT_MODE;
  };

  for (const block of blocks) {
    if (isServerAlbumGridImgBlock(block, blocks)) {
      const extracted = extractImagesFromImgsBlock(block);
      if (extracted.length > 0) {
        if (imageBuffer.length === 0) {
          bufferAlbumLayout = albumLayoutModeFromConfig(
            block.config ?? undefined,
          );
        }
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
/** Số ảnh trên một hàng Justified (album ≥3, trừ nhánh 4 = 2×2 và 5 = 2+3). */
export const JUSTIFIED_MAX_PER_ROW = 3;
/**
 * Ô dọc bị “cắt” khi đứng cạnh ảnh ngang: width ≈ aspect / Σaspect.
 * 0.61 / (0.61+1.78) ≈ 25% — quá hẹp. Tách hàng nếu bất kỳ ảnh dọc nào
 * chiếm dưới ngưỡng này.
 */
export const JUSTIFIED_PORTRAIT_MIN_WIDTH_FRACTION = 0.36;

/** Aspect ratio = width / height. Thiếu số liệu → null (đừng giả 1200×800). */
export function gridImageAspectOrNull(image: GridImage): number | null {
  if (!hasGridImageDimensions(image)) return null;
  return image.width / image.height;
}

/** Aspect ratio = width / height (fallback 1.5 nếu thiếu — chỉ chỗ không layout hàng). */
export function gridImageAspect(image: GridImage): number {
  return gridImageAspectOrNull(image) ?? GRID_IMAGE_DEFAULT_WIDTH / GRID_IMAGE_DEFAULT_HEIGHT;
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
      kind: "columns2";
      cells: AlbumCell[];
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
    }
  | {
      kind: "stack";
      cells: AlbumCell[];
      remaining: number;
      overlaySlotIndex: number | null;
    };

/** Phân cột masonry theo chiều cao ước lượng (1/aspect). */
export function packMasonryColumns(
  cells: AlbumCell[],
  maxCols: number = MASONRY_MAX_COLUMNS,
): AlbumCell[][] {
  if (cells.length === 0) return [];
  const colCount = Math.min(maxCols, Math.max(1, cells.length));
  const columns: AlbumCell[][] = Array.from({ length: colCount }, () => []);
  const heights = Array.from({ length: colCount }, () => 0);

  for (const cell of cells) {
    let shortest = 0;
    for (let i = 1; i < colCount; i++) {
      if (heights[i]! < heights[shortest]!) shortest = i;
    }
    columns[shortest]!.push(cell);
    heights[shortest]! += cell.aspect > 0 ? 1 / cell.aspect : 1;
  }

  return columns;
}

function toCell(image: GridImage, index: number): AlbumCell {
  return { image, index, aspect: gridImageAspect(image) };
}

/** Ảnh dọc bị ép quá hẹp trên hàng justified (đứng cạnh ảnh ngang/rộng). */
export function justifiedRowCrampsPortrait(
  cells: ReadonlyArray<{ aspect: number }>,
): boolean {
  if (cells.length < 2) return false;
  const aspectSum = cells.reduce((sum, cell) => sum + cell.aspect, 0);
  if (!(aspectSum > 0)) return false;
  return cells.some((cell) => {
    if (cell.aspect >= 1 / SQUARE_ASPECT_TOLERANCE) return false;
    return cell.aspect / aspectSum < JUSTIFIED_PORTRAIT_MIN_WIDTH_FRACTION;
  });
}

/** Tách hàng chèn ảnh dọc: giữ thứ tự, gói greedy đến khi hàng bắt đầu chèn. */
function unpackCrampedJustifiedRow(cells: AlbumCell[]): AlbumCell[][] {
  /* Hàng đủ 3 cột — giữ grid, không tách 2+1 / 1+1+1 (3 ảnh dọc đều ~33%). */
  if (cells.length >= JUSTIFIED_MAX_PER_ROW) {
    return [cells];
  }
  if (cells.length <= 1 || !justifiedRowCrampsPortrait(cells)) {
    return [cells];
  }
  const rows: AlbumCell[][] = [];
  let current: AlbumCell[] = [];
  for (const cell of cells) {
    const trial = [...current, cell];
    if (
      current.length > 0 &&
      (trial.length > JUSTIFIED_MAX_PER_ROW ||
        justifiedRowCrampsPortrait(trial))
    ) {
      rows.push(current);
      current = [cell];
    } else {
      current = trial;
    }
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

/**
 * Tổng aspect (width/height) các ô trên một hàng Justified.
 * Dùng cho CSS `--jrow-aspect-sum` (xem `justifiedRowStyle`).
 */
export function justifiedRowCanvasAspect(
  cells: ReadonlyArray<{ aspect: number }>,
): number {
  const aspectSum = cells.reduce((sum, cell) => sum + cell.aspect, 0);
  return aspectSum > 0 ? aspectSum : 1;
}

/**
 * Style vars hàng Justified: chiều cao = (container − gap ngang) / tổng aspect.
 * Trừ `(n−1) × gap` khỏi bề rộng để khe ngang và khe dọc cùng visual
 * (nếu chỉ set aspect-ratio = tổng aspect, hàng cao thừa → letterbox dọc trông dày hơn gap ngang).
 */
export function justifiedRowStyle(
  cells: ReadonlyArray<{ aspect: number }>,
): { ["--jrow-aspect-sum"]: string; ["--jrow-gaps"]: string } {
  return {
    "--jrow-aspect-sum": String(justifiedRowCanvasAspect(cells)),
    "--jrow-gaps": String(Math.max(0, cells.length - 1)),
  };
}

/**
 * Chia cells thành các hàng Justified (khớp icon editor: 5 → 2+3).
 * Export để ImageGrid tách lại khi đo được tỉ lệ intrinsic (metadata hay sai).
 */
export function splitJustifiedRows(cells: AlbumCell[]): AlbumCell[][] {
  let rows: AlbumCell[][];
  // Album 2 ảnh: cạnh nhau trừ khi ảnh dọc bị ép hẹp cạnh ảnh ngang.
  if (cells.length === 2) {
    rows = [cells];
  } else if (cells.length === 3) {
    /* Luôn 1 hàng × 3 cột — không tách 1+2 vì hàng “dẹp” (ảnh ngang/screenshot). */
    rows = [cells];
  } else if (cells.length === 4) {
    // 4 ảnh: 2×2 cân bằng — tránh hàng 3+1 lệch.
    rows = [cells.slice(0, 2), cells.slice(2, 4)];
  } else if (cells.length === 5) {
    // 5 ảnh: 2 trên + 3 dưới (khớp pictogram Hàng cân).
    rows = [cells.slice(0, 2), cells.slice(2, 5)];
  } else {
    rows = [];
    for (let i = 0; i < cells.length; i += JUSTIFIED_MAX_PER_ROW) {
      rows.push(cells.slice(i, i + JUSTIFIED_MAX_PER_ROW));
    }
  }
  return rows.flatMap(unpackCrampedJustifiedRow);
}

/**
 * Album layout theo preset user (mặc định justified):
 * - 1 ảnh: luôn single (giữ tỉ lệ gốc)
 * - justified: hàng cân (2 / 3 / 2+2 / 2+3 / 3+3 / …)
 * - masonry: cột dọc theo tỉ lệ ảnh
 * - columns2: lưới vuông 2 cột cố định
 * - square: lưới ô vuông (2–6 / compose 7+)
 * - stack: xếp dọc full-width (Behance) — luôn xổ đủ ảnh, không +N
 * - >6 ảnh ở feed (layout khác stack): hiện 6 ô đầu, ô cuối phủ "+N" (trừ showAll)
 */
export function resolveAlbumLayout(
  images: GridImage[],
  showAll = false,
  mode: AlbumLayoutMode | unknown = DEFAULT_ALBUM_LAYOUT_MODE,
): AlbumLayout {
  const total = images.length;
  const albumMode = normalizeAlbumLayoutMode(mode);
  /* Stack = strip dọc Behance — cắt 6 + overlay vô nghĩa; luôn hiện đủ. */
  const effectiveShowAll = showAll || albumMode === "stack";

  if (total === 1) {
    return {
      kind: "single",
      portrait: isPortraitGridImage(images[0]!),
      cell: toCell(images[0]!, 0),
    };
  }

  const displayCount = albumGridDisplayCount(total, effectiveShowAll);
  const remaining = albumGridRemainingCount(total, effectiveShowAll);
  const overlaySlotIndex = remaining > 0 ? displayCount - 1 : null;
  const displayImages = images.slice(0, displayCount);
  const cells = displayImages.map(toCell);

  if (albumMode === "stack") {
    return {
      kind: "stack",
      cells,
      remaining,
      overlaySlotIndex,
    };
  }

  if (albumMode === "masonry") {
    return {
      kind: "masonry",
      columns: packMasonryColumns(cells),
      remaining,
      overlaySlotIndex,
    };
  }

  if (albumMode === "columns2") {
    return {
      kind: "columns2",
      cells,
      remaining,
      overlaySlotIndex,
    };
  }

  if (albumMode === "square") {
    return {
      kind: "square",
      layoutCount: albumGridLayoutCount(total, effectiveShowAll),
      displayImages,
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
  options?: {
    singlePortrait?: boolean;
    preferPublic?: boolean;
    /** Ảnh dọc dài (stack) — variant `tall` (chỉ giới hạn bề ngang). */
    tall?: boolean;
  },
): ImageSeedDeliveryAsset {
  const preview = image.previewSrc?.trim();
  if (preview) return { src: preview };
  if (image.composePending) return { src: "" };
  if (options?.tall) {
    return {
      src: resolveImageSeedTallUrl(image.id, image.width, image.height),
    };
  }
  if (options?.preferPublic) {
    return {
      src: resolveImageSeedUrl(image.id, image.width, image.height),
    };
  }
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
