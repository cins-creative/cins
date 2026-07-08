import { isEditorStockImageSeed } from "@/lib/editor/editor-stock-image-seeds";
import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  isCfImageUuid,
  isExternalHttpImageRef,
  isTemporaryImageRef,
} from "@/lib/truong/image-ref";

const PICSUM_BASE = "https://picsum.photos/seed/";

export { isExternalHttpImageRef };

export function cfDeliveryUrl(
  imageId: string,
  variant = "public",
): string | null {
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId.trim()}/${variant}`;
}

function cfDeliveryUrlWithFallbacks(
  imageId: string,
  variants: string[],
): string | null {
  for (const variant of variants) {
    const url = cfDeliveryUrl(imageId, variant);
    if (url) return url;
  }
  return null;
}

/**
 * Resolve seed/id trong block `imgs` hoặc cover:
 * - blob:/data: → giữ nguyên
 * - http(s) → URL ngoài (web trường, …)
 * - UUID Cloudflare → imagedelivery.net
 * - seed demo (`m-`, `extra-`, …) → picsum placeholder
 */
export function resolveImageSeedUrl(
  seed: string,
  w = 900,
  h = 600,
): string {
  const trimmed = (seed || "").trim();
  if (!trimmed) return "";
  if (isEditorStockImageSeed(trimmed)) return "";
  if (isTemporaryImageRef(trimmed)) return trimmed;
  if (isExternalHttpImageRef(trimmed)) return trimmed;
  if (isCfImageUuid(trimmed)) {
    const fromCf = cfDeliveryUrl(trimmed, "public");
    if (fromCf) return fromCf;
  }
  return `${PICSUM_BASE}${encodeURIComponent(trimmed)}/${w}/${h}`;
}

/** Thumbnail grid / card preview. */
export function resolveImageSeedThumbUrl(
  seed: string,
  w: number,
  h: number,
): string {
  const trimmed = (seed || "").trim();
  if (!trimmed) return "";
  if (isEditorStockImageSeed(trimmed)) return "";
  if (isTemporaryImageRef(trimmed)) return trimmed;
  if (isExternalHttpImageRef(trimmed)) return trimmed;
  if (isCfImageUuid(trimmed)) {
    const fromCf = cfDeliveryUrlWithFallbacks(trimmed, [
      "public",
      "medium",
      "thumbnail",
    ]);
    if (fromCf) return fromCf;
  }
  return `${PICSUM_BASE}${encodeURIComponent(trimmed)}/${w}/${h}`;
}

/** Lightbox — variant lớn hơn khi có. */
export function resolveImageSeedLightboxUrl(
  seed: string,
  w: number,
  h: number,
): string {
  const trimmed = (seed || "").trim();
  if (!trimmed) return "";
  if (isEditorStockImageSeed(trimmed)) return "";
  if (isTemporaryImageRef(trimmed)) return trimmed;
  if (isExternalHttpImageRef(trimmed)) return trimmed;
  if (isCfImageUuid(trimmed)) {
    const fromCf = cfDeliveryUrlWithFallbacks(trimmed, [
      "public",
      "cover",
      "medium",
    ]);
    if (fromCf) return fromCf;
  }
  return `${PICSUM_BASE}${encodeURIComponent(trimmed)}/${w}/${h}`;
}

/** Ẩn ảnh lỗi + đánh dấu container (placeholder nền xám). */
export function handleBlockImageError(
  e: { currentTarget: HTMLImageElement },
): void {
  const img = e.currentTarget;
  img.hidden = true;
  img
    .closest(
      ".image-grid-cell, .cover-img-wrap, .ph, .b-imgs, .image-lightbox-figure",
    )
    ?.classList.add("is-image-load-failed");
}
