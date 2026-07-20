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

/** Lấy Cloudflare image id từ URL delivery (hoặc chuỗi UUID thuần). */
export function cloudflareImageIdFromUrlOrId(
  value: string | null | undefined,
): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (isCloudflareImageId(raw)) return raw;
  try {
    const u = new URL(raw);
    if (!u.hostname.includes("imagedelivery.net")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts[1]?.trim() || null;
    return id && isCloudflareImageId(id) ? id : null;
  } catch {
    return null;
  }
}
