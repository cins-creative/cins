import type { Block } from "@/lib/editor/types";
import type { ImgLayout } from "@/lib/editor/image-layout";
import { isServerAlbumGridImgBlock } from "@/lib/editor/album-grid-block";

/**
 * Preset layout album feed/compose (khác LayBar 7 kiểu của block ảnh trong bài).
 * Default = justified (Masonry ngang) — hành vi cũ trước khi mở chọn.
 */
export type AlbumLayoutMode =
  | "justified"
  | "masonry"
  | "columns2"
  | "square"
  | "stack";

export const DEFAULT_ALBUM_LAYOUT_MODE: AlbumLayoutMode = "justified";

export const ALBUM_LAYOUT_MODE_META: ReadonlyArray<{
  k: AlbumLayoutMode;
  name: string;
  /** Pictogram LayoutThumbIcon gần nhất. */
  thumb: ImgLayout;
}> = [
  { k: "justified", name: "Masonry ngang", thumb: "justified" },
  { k: "masonry", name: "Masonry dọc", thumb: "masonry" },
  { k: "columns2", name: "Lưới 2 cột", thumb: "grid4" },
  { k: "square", name: "Lưới đều", thumb: "grid3" },
  { k: "stack", name: "Xếp dọc", thumb: "full" },
];

const ALBUM_LAYOUT_MODE_SET = new Set<string>(
  ALBUM_LAYOUT_MODE_META.map((m) => m.k),
);

export function normalizeAlbumLayoutMode(
  value: unknown,
): AlbumLayoutMode {
  if (typeof value === "string" && ALBUM_LAYOUT_MODE_SET.has(value)) {
    return value as AlbumLayoutMode;
  }
  return DEFAULT_ALBUM_LAYOUT_MODE;
}

/** Đọc preset từ config block `imgs` (ô album). */
export function albumLayoutModeFromConfig(
  config: Record<string, unknown> | null | undefined,
): AlbumLayoutMode {
  return normalizeAlbumLayoutMode(config?.albumLayout);
}

/** Preset của dãy album đầu tiên trong blocks (feed / edit). */
export function albumLayoutModeFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): AlbumLayoutMode {
  if (!blocks?.length) return DEFAULT_ALBUM_LAYOUT_MODE;
  for (const block of blocks) {
    if (!isServerAlbumGridImgBlock(block, blocks)) continue;
    return albumLayoutModeFromConfig(block.config ?? undefined);
  }
  return DEFAULT_ALBUM_LAYOUT_MODE;
}
