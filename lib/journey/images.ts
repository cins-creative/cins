import "server-only";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  coverThumbFlexibleVariant,
  coverThumbLayoutSize,
  coverThumbZoom,
  type CoverThumbMeta,
} from "@/lib/journey/cover-thumb";
import {
  isExternalHttpImageRef,
  isTemporaryImageRef,
} from "@/lib/truong/image-ref";

/** Vai trò hiển thị — map sang kích thước layout + variant Cloudflare. */
export type JourneyImageRole =
  | "gallery-pinned"
  | "gallery-grid"
  | "milestone-preview";

export type JourneyImageAsset = {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
};

const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type VariantStep = { name: string; w: number };

type RolePreset = {
  width: number;
  height: number;
  /** Variant mặc định cho `src` (fallback khi browser không hỗ trợ srcset). */
  defaultVariant: string;
  /** Các variant nhỏ → lớn cho `srcset` (WebP/AVIF qua CF). */
  srcSetVariants: VariantStep[];
};

/**
 * Kích thước theo layout Journey v2 (@2x retina):
 *   • Gallery aside pinned ~340px → 560×315 (16:9) — `grid` + srcset `gridsm`/`grid`/`public` (retina 2x cần ~680px)
 *   • Gallery grid ~320px ô → 640×360 (16:9) — variant `grid` + `gridsm`
 *   • Milestone card preview ~680px feed → 640×360 layout — variant `public` (+ `grid`/`gridsm` srcset nhỏ)
 *
 * Variants: `avatar`, `thumbnail`, `grid`, `gridsm`, `public` (Dashboard 2026-07-04).
 */
const CF_DEFAULT_VARIANT = "public";

const ROLE_PRESETS: Record<JourneyImageRole, RolePreset> = {
  "gallery-pinned": {
    width: 560,
    height: 315,
    defaultVariant: "grid",
    srcSetVariants: [
      { name: "gridsm", w: 400 },
      { name: "grid", w: 640 },
      { name: "public", w: 1366 },
    ],
  },
  "gallery-grid": {
    width: 640,
    height: 360,
    defaultVariant: "grid",
    srcSetVariants: [
      { name: "gridsm", w: 400 },
      { name: "grid", w: 640 },
    ],
  },
  "milestone-preview": {
    width: 640,
    height: 360,
    defaultVariant: "public",
    srcSetVariants: [
      { name: "gridsm", w: 400 },
      { name: "grid", w: 640 },
      { name: "public", w: 1366 },
    ],
  },
};

function cfDeliveryUrl(
  imageId: string,
  variant: string,
): string | null {
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId.trim()}/${variant}`;
}

function picsumFallback(
  seed: string,
  width: number,
  height: number,
): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

/**
 * Resolve cover_id → URL Cloudflare Images (+ srcset) hoặc picsum legacy.
 * Dùng ở server fetch (`gallery-fetch`, `milestones-fetch`).
 */
export function resolveJourneyImage(
  coverId: string | null | undefined,
  role: JourneyImageRole,
): JourneyImageAsset | null {
  const trimmed = coverId?.trim();
  if (!trimmed) return null;

  const preset = ROLE_PRESETS[role];

  if (isExternalHttpImageRef(trimmed) && !isTemporaryImageRef(trimmed)) {
    return {
      src: trimmed,
      width: preset.width,
      height: preset.height,
    };
  }

  if (CF_UUID_RE.test(trimmed)) {
    const src =
      cfDeliveryUrl(trimmed, preset.defaultVariant) ??
      cfDeliveryUrl(trimmed, CF_DEFAULT_VARIANT);
    if (!src) return null;

    const srcSetParts: string[] = [];
    for (const step of preset.srcSetVariants) {
      const url = cfDeliveryUrl(trimmed, step.name);
      if (url) srcSetParts.push(`${url} ${step.w}w`);
    }

    return {
      src,
      srcSet: srcSetParts.length > 0 ? srcSetParts.join(", ") : undefined,
      width: preset.width,
      height: preset.height,
    };
  }

  return {
    src: picsumFallback(trimmed, preset.width, preset.height),
    width: preset.width,
    height: preset.height,
  };
}

/** Gộp asset vào object có `src` string (giữ tương thích type cũ). */
export function journeyImageFields(
  coverId: string | null | undefined,
  role: JourneyImageRole,
): {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
} | null {
  const asset = resolveJourneyImage(coverId, role);
  if (!asset?.src) return null;
  return {
    src: asset.src,
    srcSet: asset.srcSet,
    width: asset.width,
    height: asset.height,
  };
}

/** Chỉ `/public` — Masonry giữ toàn khung ảnh gốc (không `grid` crop). */
export function journeyImagePublicOnly(
  coverId: string | null | undefined,
): {
  src: string;
  width?: number;
  height?: number;
} | null {
  const trimmed = coverId?.trim();
  if (!trimmed) return null;
  if (isExternalHttpImageRef(trimmed) && !isTemporaryImageRef(trimmed)) {
    return { src: trimmed };
  }
  if (!CF_UUID_RE.test(trimmed)) return null;
  const src = cfDeliveryUrl(trimmed, "public");
  if (!src) return null;
  return { src, width: 1366, height: 768 };
}

/**
 * Gallery card / bài dài — flexible CF `fit=cover` + gravity theo điểm neo.
 * Không có meta → fallback variant `grid`/`gridsm` cũ.
 */
export function journeyImageFieldsWithCoverThumb(
  coverId: string | null | undefined,
  meta: CoverThumbMeta | null | undefined,
): {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
} | null {
  const trimmed = coverId?.trim();
  if (!trimmed) return null;

  if (!meta) {
    return journeyImageFields(trimmed, "gallery-grid");
  }

  if (isExternalHttpImageRef(trimmed) && !isTemporaryImageRef(trimmed)) {
    const size = coverThumbLayoutSize(meta, "card");
    return { src: trimmed, width: size.width, height: size.height };
  }

  if (!CF_UUID_RE.test(trimmed)) {
    return journeyImageFields(trimmed, "gallery-grid");
  }

  const card = coverThumbLayoutSize(meta, "card");
  // Zoom > 1 cần ảnh gốc — CF gravity đã crop sẵn sẽ làm scale CSS sai.
  if (coverThumbZoom(meta) > 1.001) {
    const src = cfDeliveryUrl(trimmed, "public");
    if (!src) return journeyImageFields(trimmed, "gallery-grid");
    return { src, width: card.width, height: card.height };
  }

  const cardSm = coverThumbLayoutSize(meta, "card-sm");
  const src = cfDeliveryUrl(trimmed, coverThumbFlexibleVariant(meta, "card"));
  const sm = cfDeliveryUrl(trimmed, coverThumbFlexibleVariant(meta, "card-sm"));
  if (!src) return journeyImageFields(trimmed, "gallery-grid");

  const srcSetParts: string[] = [];
  if (sm) srcSetParts.push(`${sm} ${cardSm.width}w`);
  srcSetParts.push(`${src} ${card.width}w`);

  return {
    src,
    srcSet: srcSetParts.join(", "),
    width: card.width,
    height: card.height,
  };
}
