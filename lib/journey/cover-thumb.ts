import type { Block } from "@/lib/editor/types";
import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  isCfImageUuid,
  isExternalHttpImageRef,
  isTemporaryImageRef,
} from "@/lib/truong/image-ref";

export type CoverThumbRatio = "16:9";

export type CoverThumbMeta = {
  ratio: CoverThumbRatio;
  /** Focal X 0–100 (phần trăm chiều ngang ảnh). */
  x: number;
  /** Focal Y 0–100 (phần trăm chiều dọc ảnh). */
  y: number;
  /**
   * Phóng trong khung cố định (1–3). Mặc định 1 = vừa cover.
   * Render: `transform: scale(zoom)` + `transform-origin` tại điểm neo.
   */
  zoom?: number;
};

export const DEFAULT_COVER_THUMB_META: CoverThumbMeta = {
  ratio: "16:9",
  x: 50,
  y: 50,
  zoom: 1,
};

export const COVER_THUMB_ZOOM_MIN = 1;
export const COVER_THUMB_ZOOM_MAX = 3;

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

export function clampCoverThumbZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(
    COVER_THUMB_ZOOM_MAX,
    Math.max(COVER_THUMB_ZOOM_MIN, Math.round(value * 100) / 100),
  );
}

export function coverThumbZoom(meta: CoverThumbMeta | null | undefined): number {
  return clampCoverThumbZoom(meta?.zoom ?? 1);
}

function isBunnyEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  const url = typeof block.config?.url === "string" ? block.config.url : "";
  return /iframe\.mediadelivery\.net|mediadelivery\.net\/embed/i.test(url);
}

/** Chấp nhận legacy `"4:3"` rồi ép về 16:9 khi normalize. */
function isReadableCoverThumbRatio(
  value: unknown,
): value is "16:9" | "4:3" {
  return value === "16:9" || value === "4:3";
}

export function isCoverThumbRatio(value: unknown): value is CoverThumbRatio {
  return value === "16:9";
}

export function normalizeCoverThumbMeta(
  raw: unknown,
): CoverThumbMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isReadableCoverThumbRatio(obj.ratio)) return null;
  const x = typeof obj.x === "number" ? obj.x : Number(obj.x);
  const y = typeof obj.y === "number" ? obj.y : Number(obj.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const zoomRaw =
    obj.zoom === undefined || obj.zoom === null
      ? 1
      : typeof obj.zoom === "number"
        ? obj.zoom
        : Number(obj.zoom);
  return {
    ratio: "16:9",
    x: clampPct(x),
    y: clampPct(y),
    zoom: clampCoverThumbZoom(zoomRaw),
  };
}

/** Đọc `coverThumb` từ `noi_dung_blocks` — ưu tiên embed Bunny rồi block đầu có key. */
export function findCoverThumbMeta(
  blocks: ReadonlyArray<Block> | null | undefined,
): CoverThumbMeta | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (!isBunnyEmbedBlock(block)) continue;
    const meta = normalizeCoverThumbMeta(block.config?.coverThumb);
    if (meta) return meta;
  }
  for (const block of blocks) {
    const meta = normalizeCoverThumbMeta(block.config?.coverThumb);
    if (meta) return meta;
  }
  return null;
}

export function readCoverThumbMeta(
  blocks: ReadonlyArray<Block> | null | undefined,
): CoverThumbMeta {
  return findCoverThumbMeta(blocks) ?? DEFAULT_COVER_THUMB_META;
}

/**
 * Ghi `coverThumb` vào blocks trước publish/draft (Journey user + org_bai_dang).
 * `null` = gỡ meta (xoá thumbnail).
 */
export function applyCoverThumbMeta(
  blocks: Block[],
  meta: CoverThumbMeta | null,
): Block[] {
  if (!blocks.length) return blocks;

  let targetIdx = blocks.findIndex(isBunnyEmbedBlock);
  if (targetIdx < 0) {
    targetIdx = blocks.findIndex((b) => b.loai === "embed");
  }
  if (targetIdx < 0) targetIdx = 0;

  const normalized = meta ? normalizeCoverThumbMeta(meta) : null;

  return blocks.map((block, i) => {
    const config = { ...(block.config ?? {}) };
    if (i === targetIdx) {
      if (normalized) config.coverThumb = normalized;
      else delete config.coverThumb;
      return { ...block, config, thu_tu: i };
    }
    if ("coverThumb" in config) {
      delete config.coverThumb;
      return { ...block, config, thu_tu: i };
    }
    return { ...block, thu_tu: i };
  });
}

export function coverThumbObjectPosition(
  meta: CoverThumbMeta | null | undefined,
): string {
  const m = meta ?? DEFAULT_COVER_THUMB_META;
  return `${clampPct(m.x)}% ${clampPct(m.y)}%`;
}

/** Style ảnh trong khung cố định — object-position + zoom quanh điểm neo. */
export function coverThumbImageStyle(
  meta: CoverThumbMeta | null | undefined,
): {
  objectPosition: string;
  transform?: string;
  transformOrigin?: string;
} {
  const m = meta ?? DEFAULT_COVER_THUMB_META;
  const zoom = coverThumbZoom(m);
  const objectPosition = coverThumbObjectPosition(m);
  if (zoom <= 1.001) {
    return { objectPosition };
  }
  return {
    objectPosition,
    transform: `scale(${zoom})`,
    transformOrigin: `${clampPct(m.x)}% ${clampPct(m.y)}%`,
  };
}

export function coverThumbAspectRatio(
  _meta?: CoverThumbMeta | null,
): number {
  return 16 / 9;
}

export function coverThumbAspectCss(
  _meta?: CoverThumbMeta | null,
): string {
  return "16 / 9";
}

/** Gravity CF flexible: 0–1 từ phần trăm. */
export function coverThumbGravityParam(
  meta: CoverThumbMeta | null | undefined,
): string {
  const m = meta ?? DEFAULT_COVER_THUMB_META;
  const gx = Math.round((clampPct(m.x) / 100) * 100) / 100;
  const gy = Math.round((clampPct(m.y) / 100) * 100) / 100;
  return `${gx}x${gy}`;
}

export function coverThumbFlexibleVariant(
  meta: CoverThumbMeta | null | undefined,
  size: "card" | "card-sm" | "hero" = "card",
): string {
  const g = coverThumbGravityParam(meta);
  if (size === "hero") {
    return `w=1366,h=768,fit=cover,gravity=${g}`;
  }
  if (size === "card-sm") {
    return `w=400,h=225,fit=cover,gravity=${g}`;
  }
  return `w=640,h=360,fit=cover,gravity=${g}`;
}

export function coverThumbLayoutSize(
  _meta?: CoverThumbMeta | null,
  size: "card" | "card-sm" | "hero" = "card",
): { width: number; height: number } {
  if (size === "hero") {
    return { width: 1366, height: 768 };
  }
  if (size === "card-sm") {
    return { width: 400, height: 225 };
  }
  return { width: 640, height: 360 };
}

/** URL CF có gravity — null nếu không phải CF UUID. */
export function resolveCoverThumbDeliveryUrl(
  coverId: string | null | undefined,
  meta: CoverThumbMeta | null | undefined,
  size: "card" | "card-sm" | "hero" | "public" = "card",
): string | null {
  const trimmed = coverId?.trim();
  if (!trimmed) return null;
  if (isTemporaryImageRef(trimmed) || isExternalHttpImageRef(trimmed)) {
    return trimmed;
  }
  if (!isCfImageUuid(trimmed)) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  if (size === "public" || coverThumbZoom(meta) > 1.001) {
    return `https://imagedelivery.net/${hash}/${trimmed}/public`;
  }
  const variant = coverThumbFlexibleVariant(meta, size);
  return `https://imagedelivery.net/${hash}/${trimmed}/${variant}`;
}
