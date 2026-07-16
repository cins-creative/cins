import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  isBrokenCfDeliveryUrl,
  isExternalHttpImageRef,
} from "@/lib/truong/image-ref";

/**
 * Ảnh bìa Cloudflare Images — brief: imagedelivery.net/{account}/{cover_id}/public
 */
export function getCoverUrl(
  coverId: string | null | undefined,
  variant = "public",
): string | null {
  const trimmed = coverId?.trim();
  if (!trimmed) return null;

  if (isExternalHttpImageRef(trimmed)) {
    return isBrokenCfDeliveryUrl(trimmed) ? null : trimmed;
  }

  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${trimmed}/${variant}`;
}

/**
 * Cover cho OG/Facebook large card: 1200×630 (1.91:1).
 * Ảnh vuông (`/public`) khiến FB hiện card nhỏ ngang — crop `fit=cover` qua CF flexible variant.
 */
export const OG_COVER_CF_VARIANT = "w=1200,h=630,fit=cover";

export function getCoverOgUrl(
  coverId: string | null | undefined,
): string | null {
  const trimmed = coverId?.trim();
  if (!trimmed) return null;
  /* URL ngoài không crop được qua CF — dùng null để caller fallback Satori 1200×630. */
  if (isExternalHttpImageRef(trimmed)) return null;
  return getCoverUrl(trimmed, OG_COVER_CF_VARIANT);
}
