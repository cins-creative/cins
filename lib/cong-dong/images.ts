import { getCfAccountHash } from "@/lib/cloudflare/account-hash";

export function congDongImageUrl(
  cloudflareId: string,
  variant = "public",
): string | null {
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${cloudflareId.trim()}/${variant}`;
}

/** Banner cộng đồng / event rail — CF Images chỉ đảm bảo variant `public`. */
export function congDongBannerImageUrl(
  cloudflareId: string | null | undefined,
): string | null {
  if (!cloudflareId?.trim()) return null;
  return congDongImageUrl(cloudflareId, "public");
}
