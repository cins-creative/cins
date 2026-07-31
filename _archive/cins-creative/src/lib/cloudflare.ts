export function cfImageUrl(
  id: string | null | undefined,
  variant = "public",
): string | null {
  if (!id) return null;
  const hash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${id}/${variant}`;
}
