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
