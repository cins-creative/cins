import { isEditorEmptyImageSeed } from "@/lib/editor/editor-stock-image-seeds";
import { resolveImageSeedUrl } from "@/lib/editor/resolve-image-seed-url";

/**
 * Layout cho block ảnh.
 *
 * Nhóm adaptive (không crop, giữ tỉ lệ gốc):
 *   - full:      Tràn viền, nhiều ảnh xếp dọc full-width.
 *   - masonry:   Masonry 3 cột (CSS columns), theo chiều cao thật của ảnh.
 *   - justified: Hàng giãn full chiều ngang, cao hàng co theo tỉ lệ ảnh.
 *
 * Nhóm lưới cơ bản (cắt gọn — object-fit: cover):
 *   - duo:       2 ảnh cạnh nhau, cao đều.
 *   - grid2:     3 ảnh ngang (1 hàng × 3 cột), ô vuông.
 *   - grid3:     Lưới 3 cột, ô vuông đều.
 *   - grid4:     Lưới 2×2, tối đa 4 ô vuông.
 *   - hero:      1 ảnh lớn trên + dải ảnh nhỏ bên dưới.
 */
export type ImgLayout =
  | "full"
  | "masonry"
  | "justified"
  | "duo"
  | "grid2"
  | "grid3"
  | "grid4"
  | "hero";

export type ImgLayoutMeta = {
  k: ImgLayout;
  /** Cap số ô preview (dynamic = theo số ảnh, tối đa n). */
  n: number;
  name: string;
  /** true = số ô = số ảnh (tối đa n), thay vì cố định n ô. */
  dynamic?: boolean;
};

const IMG_LAYOUT_META: ImgLayoutMeta[] = [
  { k: "full", n: 30, name: "Tràn viền", dynamic: true },
  { k: "duo", n: 30, name: "Đôi (2 cột)", dynamic: true },
  { k: "grid2", n: 30, name: "3 ảnh ngang", dynamic: true },
  { k: "grid3", n: 30, name: "Lưới 3 cột", dynamic: true },
  { k: "grid4", n: 4, name: "Lưới 2×2", dynamic: false },
  { k: "masonry", n: 30, name: "Masonry 3 cột", dynamic: true },
  { k: "justified", n: 30, name: "Justified", dynamic: true },
  { k: "hero", n: 30, name: "Nổi bật", dynamic: true },
];

/** Layout hiển thị trên LayBar. */
export const IMG_LAYOUTS: ImgLayoutMeta[] = IMG_LAYOUT_META;

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

/** Layout động còn chỗ thêm ô ảnh (masonry, justified, full, …). */
export function canAppendImageSlot(
  layout: ImgLayout,
  imgs: ReadonlyArray<string>,
): boolean {
  const meta = getImgLayoutMeta(layout);
  if (!meta.dynamic) return false;
  return imgs.length < meta.n;
}

export function imgLayoutPreviewSlots(
  layout: ImgLayout,
  photoCount: number,
): number {
  const meta = getImgLayoutMeta(layout);
  return Math.min(Math.max(photoCount, 1), meta.n);
}

/** Seed ảnh thật (không placeholder `new-…` / stock editor `lib-…`). */
export function countFilledImageSeeds(imgs: ReadonlyArray<string>): number {
  return imgs.filter((s) => {
    const t = s.trim();
    return t.length > 0 && !isEditorEmptyImageSeed(t);
  }).length;
}

const LAYOUT_SLOT_FLOOR: Partial<Record<ImgLayout, number>> = {
  duo: 2,
  grid2: 3,
  grid3: 3,
  hero: 2,
};

/** Số ô gợi ý khi đổi layout (grid3 → 3 cột; full → 1 ô nếu chưa có ảnh). */
export function imgLayoutSuggestedSlots(
  layout: ImgLayout,
  imgs: ReadonlyArray<string>,
): number {
  const meta = getImgLayoutMeta(layout);
  if (!meta.dynamic) {
    return Math.max(imgs.length, meta.n);
  }
  const filled = countFilledImageSeeds(imgs);
  const floor = LAYOUT_SLOT_FLOOR[layout] ?? 1;
  return Math.min(Math.max(filled, floor), meta.n);
}

/** Số ô hiển thị theo mảng thực tế — không ép floor sau khi user thu gọn. */
export function imgLayoutEditorMinSlots(
  layout: ImgLayout,
  imgs: ReadonlyArray<string>,
): number {
  const meta = getImgLayoutMeta(layout);
  const count = imgs.length;
  if (!meta.dynamic) {
    return Math.max(count, meta.n);
  }
  const filled = countFilledImageSeeds(imgs);
  return Math.min(Math.max(Math.max(count, filled), 1), meta.n);
}

function filledImageSeeds(imgs: ReadonlyArray<string>): string[] {
  return imgs.filter((s) => {
    const t = s.trim();
    return t.length > 0 && !isEditorEmptyImageSeed(t);
  });
}

/** Bổ sung seed `new-…` cho ô trống. `expand` = khi đổi layout / gán slot; `display` = render. */
export function padBlockImageSeedsForLayout(
  blockId: string,
  imgs: ReadonlyArray<string>,
  layout: ImgLayout,
  mode: "display" | "expand" = "display",
): string[] {
  if (mode === "expand") {
    const need = imgLayoutSuggestedSlots(layout, imgs);
    const next = filledImageSeeds(imgs).slice(0, need);
    while (next.length < need) {
      next.push(`new-${blockId}-${next.length}`);
    }
    return next;
  }

  const need = imgLayoutSuggestedSlots(layout, imgs);
  const next = [...imgs];
  while (
    next.length > need &&
    isEditorEmptyImageSeed(next[next.length - 1] ?? "")
  ) {
    next.pop();
  }
  if (next.length === 0) {
    next.push(`new-${blockId}-0`);
  }
  while (next.length < need) {
    next.push(`new-${blockId}-${next.length}`);
  }
  return next;
}

/** Map layout cũ (đã bỏ) → 1 trong 3 layout mới, để bài đăng cũ không vỡ. */
const LEGACY_LAYOUT_MAP: Record<string, ImgLayout> = {
  full: "full",
  boxed: "full",
  stack: "full",
  duo: "duo",
  row3: "grid3",
  trio: "grid3",
  "big-right": "hero",
  strip5: "justified",
  "duo-stack": "masonry",
  grid2: "grid2",
  grid3: "grid3",
  grid4: "grid4",
  grid6: "masonry",
  grid9: "masonry",
  mosaic: "masonry",
  masonry: "masonry",
  justified: "justified",
  hero: "hero",
};

export function normalizeLegacyLayout(raw: unknown): ImgLayout {
  if (typeof raw === "string" && raw in LEGACY_LAYOUT_MAP) {
    return LEGACY_LAYOUT_MAP[raw];
  }
  return "full";
}

/** Trích seed ảnh hợp lệ từ `cells` mosaic cũ (bỏ ô chữ & seed rỗng). */
export function flattenMosaicCells(cells: unknown): string[] {
  if (!Array.isArray(cells)) return [];
  const out: string[] = [];
  for (const raw of cells) {
    if (!raw || typeof raw !== "object") continue;
    const cell = raw as { seed?: unknown; kind?: unknown };
    if (cell.kind === "text") continue;
    if (
      typeof cell.seed === "string" &&
      cell.seed.trim().length > 0 &&
      !/^m-|^extra-/.test(cell.seed)
    ) {
      out.push(cell.seed);
    }
  }
  return out;
}
