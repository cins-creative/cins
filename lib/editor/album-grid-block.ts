import { normalizeLegacyLayout } from "@/lib/editor/image-layout";
import type { Block } from "@/lib/editor/types";
import { isPlaceholderImageSeed } from "@/lib/truong/image-ref";

function imgsInBlock(block: Block): string[] {
  const cfg = block.config ?? {};
  const raw = Array.isArray(cfg.imgs) ? cfg.imgs : [];
  return raw.filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );
}

function isLegacyAlbumLayoutCandidate(block: Block): boolean {
  if (block.loai !== "imgs") return false;
  const cfg = block.config ?? {};
  if (cfg.layout === "mosaic") return false;
  const imgs = imgsInBlock(block);
  if (imgs.length !== 1) return false;
  const layout = normalizeLegacyLayout(cfg.layout);
  if (layout !== "full") return false;
  const seed = imgs[0]!.trim();
  if (/^lib-/.test(seed)) return false;
  if (isPlaceholderImageSeed(seed)) return false;
  return true;
}

/**
 * Phân loại block `imgs`:
 * - `albumGridCell: true` — ô album (toolbar «Album ảnh»), gom grid justify/masonry.
 * - `albumGridCell: false` — ảnh inline (picker «Ảnh / Album»), giữ layout user chọn.
 */
export function resolveAlbumGridCell(input: {
  albumGridCell?: boolean;
  layout?: unknown;
  imgs: string[];
}): boolean {
  if (input.imgs.length > 1) return false;
  if (input.imgs.length === 0) return false;
  if (input.albumGridCell === true) return true;
  if (input.albumGridCell === false) return false;

  const layout = normalizeLegacyLayout(input.layout);
  if (layout !== "full") return false;
  const seed = input.imgs[0]!.trim();
  if (/^lib-/.test(seed)) return false;
  if (isPlaceholderImageSeed(seed)) return false;
  return true;
}

/** Block server — có gom vào album grid khi render Journey/post. */
export function isServerAlbumGridImgBlock(
  block: Block,
  allBlocks: ReadonlyArray<Block>,
): boolean {
  if (block.loai !== "imgs") return false;
  const cfg = block.config ?? {};
  if (cfg.albumGridCell === true) return true;
  if (cfg.albumGridCell === false) return false;
  if (!isLegacyAlbumLayoutCandidate(block)) return false;

  const hasMixedContent = allBlocks.some(
    (b) => b.loai !== "imgs" && b.loai !== "spacer",
  );
  if (!hasMixedContent) return true;

  const idx = allBlocks.findIndex((b) => b.id === block.id);
  if (idx < 0) return false;

  const prev = idx > 0 ? allBlocks[idx - 1] : undefined;
  const next = idx < allBlocks.length - 1 ? allBlocks[idx + 1] : undefined;
  const prevAlbum =
    prev != null &&
    prev.config?.albumGridCell !== false &&
    isLegacyAlbumLayoutCandidate(prev);
  const nextAlbum =
    next != null &&
    next.config?.albumGridCell !== false &&
    isLegacyAlbumLayoutCandidate(next);
  return prevAlbum || nextAlbum;
}
