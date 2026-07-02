import { resolveImageSeedUrl } from "@/lib/editor/resolve-image-seed-url";

export type ImgLayout =
  | "full"
  | "boxed"
  | "stack"
  | "duo"
  | "duo-stack"
  | "row3"
  | "trio"
  | "big-right"
  | "grid4"
  | "strip5"
  | "grid6"
  | "grid9"
  | "mosaic";

export type MosaicCell = {
  seed: string;
  c: number;
  r: number;
  kind?: "image" | "text";
  text?: string;
  align?: "left" | "center" | "right";
  font?: "serif" | "sans";
  size?: "sm" | "md" | "lg";
};

export type ImgLayoutMeta = {
  k: ImgLayout;
  /** Số ô tối đa trong preview (hoặc cap khi dynamic). */
  n: number;
  name: string;
  /** true = số ô = số ảnh (tối đa n), thay vì cố định n ô. */
  dynamic?: boolean;
};

const IMG_LAYOUT_META: ImgLayoutMeta[] = [
  { k: "full", n: 1, name: "Tràn viền" },
  { k: "boxed", n: 1, name: "Trong khung" },
  { k: "stack", n: 10, name: "Xếp dọc", dynamic: true },
  { k: "duo", n: 2, name: "Đôi" },
  { k: "duo-stack", n: 10, name: "2 cột", dynamic: true },
  { k: "row3", n: 3, name: "Hàng 3" },
  { k: "trio", n: 3, name: "Lớn trái" },
  { k: "big-right", n: 3, name: "Lớn phải" },
  { k: "grid4", n: 4, name: "Lưới 4" },
  { k: "strip5", n: 5, name: "Dải 5" },
  { k: "grid6", n: 6, name: "Lưới 6" },
  { k: "grid9", n: 9, name: "Lưới 9" },
  { k: "mosaic", n: 3, name: "Lưới tùy chỉnh" },
];

/** Layout hiển thị trên LayBar — không gồm legacy ẩn khỏi picker. */
export const IMG_LAYOUTS: ImgLayoutMeta[] = IMG_LAYOUT_META.filter(
  (l) => l.k !== "stack" && l.k !== "duo-stack",
);

/** URL hiển thị ảnh trong editor — hỗ trợ blob preview, Cloudflare UUID, URL ngoài, picsum seed. */
export function resolveEditorImageUrl(
  seed: string,
  w = 900,
  h = 600,
): string {
  return resolveImageSeedUrl(seed, w, h);
}

export function getImgLayoutMeta(layout: ImgLayout): ImgLayoutMeta {
  return IMG_LAYOUT_META.find((l) => l.k === layout) ?? IMG_LAYOUT_META[0];
}

export function imgLayoutPreviewSlots(
  layout: ImgLayout,
  photoCount: number,
): number {
  if (layout === "mosaic") return 0;
  const meta = getImgLayoutMeta(layout);
  if (meta.dynamic) {
    return Math.min(Math.max(photoCount, 1), meta.n);
  }
  return meta.n;
}

export function imgLayoutSlotCount(layout: ImgLayout): number {
  return imgLayoutPreviewSlots(layout, 1);
}

export function suggestLayoutForPhotoCount(count: number): ImgLayout {
  if (count <= 1) return "full";
  if (count === 2) return "duo";
  if (count === 3) return "row3";
  if (count === 4) return "grid4";
  if (count === 5) return "strip5";
  if (count <= 6) return "grid6";
  return "grid9";
}

const MOSAIC_DEFAULT_CELL_COUNT = 4;
const MOSAIC_DEFAULT_COLS = 2;

/** Lưới mosaic mặc định: 2 cột × 2 hàng, mỗi ô 1×1. */
export function defaultMosaicGrid(
  blockId: string,
  seeds: string[] = [],
): { cols: number; cells: MosaicCell[] } {
  const normalized =
    seeds.length > 0
      ? [...seeds]
      : Array.from({ length: MOSAIC_DEFAULT_CELL_COUNT }, (_, i) => `m-${blockId}-${i}`);
  while (normalized.length < MOSAIC_DEFAULT_CELL_COUNT) {
    normalized.push(`m-${blockId}-${normalized.length}`);
  }
  const slots = normalized.slice(0, MOSAIC_DEFAULT_CELL_COUNT);
  return {
    cols: MOSAIC_DEFAULT_COLS,
    cells: slots.map((seed) => ({ seed, c: 1, r: 1 })),
  };
}
