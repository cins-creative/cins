import { getCfAccountHash } from "@/lib/cloudflare/account-hash";

/**
 * Ảnh bìa Cloudflare Images — brief: imagedelivery.net/{account}/{cover_id}/public
 */
export function getCoverUrl(
  coverId: string | null | undefined,
  variant = "public",
): string | null {
  if (!coverId?.trim()) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${coverId.trim()}/${variant}`;
}
