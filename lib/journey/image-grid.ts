import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import type { Block } from "@/lib/editor/types";
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

const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PICSUM = "https://picsum.photos/seed/";

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
  for (const group of groupBlocksForRender(blocks)) {
    if (group.type === "image_grid" && group.images.length > 0) {
      return group.images;
    }
  }
  return null;
}

/** Số layout grid hiển thị (1–5). */
export function facebookGridDisplayCount(total: number): number {
  if (total <= 0) return 0;
  return Math.min(total, 5);
}

/** Overlay +N khi nhóm có hơn 5 ảnh. */
export function facebookGridRemainingCount(total: number): number {
  return total > 5 ? total - 5 : 0;
}

function cfUrl(imageId: string, variant: string): string | null {
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId.trim()}/${variant}`;
}

/** Thumbnail grid — variant nhỏ; compose dùng previewSrc (blob). */
export function gridThumbSrc(image: GridImage): string {
  const preview = image.previewSrc?.trim();
  if (preview) return preview;

  const id = image.id.trim();
  if (id.startsWith("blob:") || id.startsWith("data:")) return id;
  if (CF_UUID_RE.test(id)) {
    return (
      cfUrl(id, "public") ??
      cfUrl(id, "medium") ??
      cfUrl(id, "thumbnail") ??
      picsum(id, image.width, image.height)
    );
  }
  return picsum(id, image.width, image.height);
}

/** Lightbox — variant lớn, giữ ratio gốc. */
export function gridLightboxSrc(image: GridImage): string {
  const preview = image.previewSrc?.trim();
  if (preview) return preview;

  const id = image.id.trim();
  if (id.startsWith("blob:") || id.startsWith("data:")) return id;
  if (CF_UUID_RE.test(id)) {
    return (
      cfUrl(id, "public") ??
      cfUrl(id, "cover") ??
      cfUrl(id, "medium") ??
      picsum(id, image.width, image.height)
    );
  }
  return picsum(id, image.width, image.height);
}

function picsum(seed: string, w: number, h: number): string {
  return `${PICSUM}${encodeURIComponent(seed)}/${w}/${h}`;
}
