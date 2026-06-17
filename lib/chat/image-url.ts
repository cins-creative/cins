import { getCfAccountHash } from "@/lib/cloudflare/account-hash";

const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCloudflareImageId(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && CF_UUID_RE.test(value.trim()));
}

export function chatImageDeliveryUrl(
  imageId: string,
  variant = "public",
): string | null {
  const id = imageId.trim();
  if (!isCloudflareImageId(id)) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${id}/${variant}`;
}
