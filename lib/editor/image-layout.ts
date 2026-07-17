import { isEditorEmptyImageSeed } from "@/lib/editor/editor-stock-image-seeds";
import { resolveImageSeedUrl } from "@/lib/editor/resolve-image-seed-url";

/**
 * Layout cho block ảnh.
 *
 * Nhóm adaptive (không crop, giữ tỉ lệ gốc):
 *   - full:      Tràn viền, nhiều ảnh xếp dọc full-width.
 *   - inset:     Một ô ~70% chiều ngang block, căn giữa, giữ tỉ lệ ảnh.
 *   - masonry:   Masonry 3 cột (CSS columns), theo chiều cao thật của ảnh.
 *   - justified: Hàng giãn full chiều ngang, cao hàng co theo tỉ lệ ảnh.
 *
 * Nhóm lưới cơ bản (cắt gọn — object-fit: cover):
 *   - duo:       2 ảnh cạnh nhau, cao đều.
 *   - grid3:     Lưới 3 cột, ô vuông đều.
 *   - grid4:     Lưới 2×2, tối đa 4 ô vuông.
 */
export type ImgLayout =
  | "full"
  | "inset"
  | "masonry"
  | "justified"
  | "duo"
  | "grid3"
  | "grid4";

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
  { k: "inset", n: 1, name: "Ô 70%", dynamic: true },
  { k: "duo", n: 30, name: "Đôi (2 cột)", dynamic: true },
  { k: "grid3", n: 30, name: "Lưới 3 cột", dynamic: true },
  { k: "grid4", n: 4, name: "Lưới 2×2", dynamic: false },
  { k: "masonry", n: 30, name: "Masonry 3 cột", dynamic: true },
  { k: "justified", n: 30, name: "Masonry ngang", dynamic: true },
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

/**
 * Số ô mặc định khi chọn layout trên LayBar — khớp pictogram LayoutThumbIcon.
 * User có thể thêm/bớt ô sau; mode `display` không ép lại floor này.
 */
const LAYOUT_ICON_SLOTS: Record<ImgLayout, number> = {
  full: 2,
  inset: 1,
  duo: 2,
  grid3: 6,
  grid4: 4,
  masonry: 6,
  justified: 5,
};

/** Số ô gợi ý khi đổi layout — tối thiểu theo icon, tối đa meta.n. */
export function imgLayoutSuggestedSlots(
  layout: ImgLayout,
  imgs: ReadonlyArray<string>,
): number {
  const meta = getImgLayoutMeta(layout);
  if (!meta.dynamic) {
    return Math.max(imgs.length, meta.n);
  }
  const filled = countFilledImageSeeds(imgs);
  const iconSlots = LAYOUT_ICON_SLOTS[layout] ?? 1;
  return Math.min(Math.max(filled, iconSlots), meta.n);
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

/** Bổ sung seed `new-…` cho ô trống. `expand` = khi đổi layout / gán slot; `display` = render (giữ ô trống user đã thêm). */
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

  const need = imgLayoutEditorMinSlots(layout, imgs);
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

/** Số ảnh tối đa mỗi hàng Justified (trừ các case đặc biệt khớp icon). */
export const EDITOR_JUSTIFIED_MAX_PER_ROW = 3;

/**
 * Chia ô Justified thành hàng — khớp LayoutThumbIcon (5 ô: 2 trên + 3 dưới).
 * 4 ô → 2×2; 5 ô → 2+3; còn lại nhóm tối đa 3.
 */
export function splitEditorJustifiedRows<T>(cells: ReadonlyArray<T>): T[][] {
  if (cells.length === 4) {
    return [cells.slice(0, 2) as T[], cells.slice(2, 4) as T[]];
  }
  if (cells.length === 5) {
    return [cells.slice(0, 2) as T[], cells.slice(2, 5) as T[]];
  }
  const rows: T[][] = [];
  for (let i = 0; i < cells.length; i += EDITOR_JUSTIFIED_MAX_PER_ROW) {
    rows.push(cells.slice(i, i + EDITOR_JUSTIFIED_MAX_PER_ROW) as T[]);
  }
  return rows;
}

/** Map layout cũ (đã bỏ) → 1 trong 3 layout mới, để bài đăng cũ không vỡ. */
const LEGACY_LAYOUT_MAP: Record<string, ImgLayout> = {
  full: "full",
  inset: "inset",
  boxed: "full",
  stack: "full",
  duo: "duo",
  row3: "grid3",
  trio: "grid3",
  "big-right": "full",
  strip5: "justified",
  "duo-stack": "masonry",
  grid2: "grid3",
  grid3: "grid3",
  grid4: "grid4",
  grid6: "masonry",
  grid9: "masonry",
  mosaic: "masonry",
  masonry: "masonry",
  justified: "justified",
  hero: "full",
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

/** Khe giữa ô ảnh trong block — chu kỳ LayBar: 2 → 4 → 0 → 2. */
export type ImgSlotGap = 0 | 2 | 4;

export const IMG_SLOT_GAP_DEFAULT: ImgSlotGap = 2;

const IMG_SLOT_GAP_CYCLE: readonly ImgSlotGap[] = [2, 4, 0];

export function normalizeImgSlotGap(raw: unknown): ImgSlotGap {
  if (raw === 0 || raw === 2 || raw === 4) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (n === 0 || n === 2 || n === 4) return n;
  }
  return IMG_SLOT_GAP_DEFAULT;
}

export function cycleImgSlotGap(current: unknown): ImgSlotGap {
  const cur = normalizeImgSlotGap(current);
  const i = IMG_SLOT_GAP_CYCLE.indexOf(cur);
  return IMG_SLOT_GAP_CYCLE[(i + 1) % IMG_SLOT_GAP_CYCLE.length]!;
}

export function imgSlotGapLabel(gap: ImgSlotGap): string {
  if (gap === 0) return "Không gap";
  return `Gap ${gap}px`;
}

export function imgSlotGapNextHint(gap: ImgSlotGap): string {
  const next = cycleImgSlotGap(gap);
  if (next === 0) return "Bỏ gap";
  return `Gap ${next}px`;
}
