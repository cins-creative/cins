/**
 * Ảnh bìa Cloudflare Images — brief: imagedelivery.net/{account}/{cover_id}/public
 */
export function getCoverUrl(
  coverId: string | null | undefined,
  variant = "public",
): string | null {
  if (!coverId?.trim()) return null;
  const hash = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH?.trim();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${coverId}/${variant}`;
}
