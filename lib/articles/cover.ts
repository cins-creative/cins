import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import { extractCfImageIdFromDeliveryUrl } from "@/lib/cloudflare/image-id-from-url";
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
  if (isExternalHttpImageRef(trimmed)) {
    /* URL imagedelivery đầy đủ → lấy UUID rồi crop; URL ngoài thật → null (Satori). */
    const cfId = extractCfImageIdFromDeliveryUrl(trimmed);
    if (!cfId) return null;
    return getCoverUrl(cfId, OG_COVER_CF_VARIANT);
  }
  return getCoverUrl(trimmed, OG_COVER_CF_VARIANT);
}

/**
 * Cover cho UI card (chat / preview nội bộ): ưu tiên crop OG, không được thì
 * dùng `/public` hoặc URL ngoài — tránh mất thumbnail khi cover_id là https.
 */
export function getCoverPreviewUrl(
  coverId: string | null | undefined,
): string | null {
  return getCoverOgUrl(coverId) ?? getCoverUrl(coverId);
}
