import { getCfAccountHash } from "@/lib/cloudflare/account-hash";

export function congDongImageUrl(
  cloudflareId: string,
  variant = "public",
): string | null {
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${cloudflareId.trim()}/${variant}`;
}
