import "server-only";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
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
 *   • Gallery aside pinned ~280px → 560×315 (16:9)
 *   • Gallery grid item ~140px → 280×280
 *   • Milestone card preview ~680px → 800×450 (16:9)
 *
 * Variant URL: chỉ `public` được đảm bảo trên mọi tài khoản CF (upload post-image).
 * Các variant tùy chỉnh (thumbnail/medium/cover) có thể 403 nếu chưa tạo trên dashboard.
 */
const CF_DEFAULT_VARIANT = "public";

const ROLE_PRESETS: Record<JourneyImageRole, RolePreset> = {
  "gallery-pinned": {
    width: 560,
    height: 315,
    defaultVariant: CF_DEFAULT_VARIANT,
    srcSetVariants: [],
  },
  "gallery-grid": {
    width: 280,
    height: 280,
    defaultVariant: CF_DEFAULT_VARIANT,
    srcSetVariants: [],
  },
  "milestone-preview": {
    width: 800,
    height: 450,
    defaultVariant: CF_DEFAULT_VARIANT,
    srcSetVariants: [],
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
      srcSet: srcSetParts.length > 1 ? srcSetParts.join(", ") : undefined,
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
