/**
 * Thumbnail cover cho chat OG / preview nội bộ.
 *
 * Cùng quy luật card Gallery (`resolvePostGridEntry` + variant `grid`):
 * có cover → cover; không cover → ảnh đầu trong bài (`first_image`).
 */

import { getCoverUrl } from "@/lib/articles/cover";
import { extractCfImageIdFromDeliveryUrl } from "@/lib/cloudflare/image-id-from-url";
import type { Block } from "@/lib/editor/types";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import {
  isExternalHttpImageRef,
  isPersistedImageSeed,
} from "@/lib/truong/image-ref";

function normalizeImageSeed(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || !isPersistedImageSeed(trimmed)) return null;
  if (isExternalHttpImageRef(trimmed)) {
    return extractCfImageIdFromDeliveryUrl(trimmed) || trimmed;
  }
  return trimmed;
}

/** Ảnh đầu tiên trong `noi_dung_blocks` (imgs[] hoặc mosaic cells) — fallback. */
export function firstImageSeedFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "imgs") continue;
    const cfg = block.config ?? {};
    const imgs = Array.isArray(cfg.imgs) ? cfg.imgs : [];
    for (const raw of imgs) {
      const seed = normalizeImageSeed(typeof raw === "string" ? raw : null);
      if (seed) return seed;
    }
    const cells = Array.isArray(cfg.cells) ? cfg.cells : [];
    for (const cell of cells) {
      if (!cell || typeof cell !== "object") continue;
      const c = cell as Record<string, unknown>;
      if (c.kind === "text") continue;
      const seed = normalizeImageSeed(
        typeof c.seed === "string" ? c.seed : null,
      );
      if (seed) return seed;
    }
  }
  return null;
}

/**
 * URL thumb giống Gallery grid card (`journeyImageFields(..., "gallery-grid")`).
 * Chat render qua `JourneyCoverImage` — nếu `/grid` 403 sẽ tự fallback `/public`.
 */
function galleryThumbUrl(seed: string): string | null {
  return getCoverUrl(seed, "grid") ?? getCoverUrl(seed, "public");
}

function urlFromGridEntry(
  entry: NonNullable<ReturnType<typeof resolvePostGridEntry>>,
): string | null {
  if (entry.coverSrc?.trim()) return entry.coverSrc.trim();
  if (!entry.coverId) return null;
  const seed = normalizeImageSeed(entry.coverId);
  return seed ? galleryThumbUrl(seed) : null;
}

/**
 * Có cover → cover; không cover → ảnh đầu trong bài (giống `j-main-gallery-item`).
 */
export function resolvePostCoverPreviewUrl(
  coverId: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
  moTa?: string | null,
): string | null {
  const entry = resolvePostGridEntry({
    coverId: coverId ?? null,
    blocks: blocks ?? null,
    moTa: moTa ?? null,
  });
  if (entry) {
    const fromGrid = urlFromGridEntry(entry);
    if (fromGrid) return fromGrid;
  }

  const fromCover = normalizeImageSeed(coverId);
  if (fromCover) return galleryThumbUrl(fromCover);

  const fromBlocks = firstImageSeedFromBlocks(blocks);
  return fromBlocks ? galleryThumbUrl(fromBlocks) : null;
}
