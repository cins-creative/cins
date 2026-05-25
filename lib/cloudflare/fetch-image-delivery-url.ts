import { pickImageDeliveryUrl } from "@/lib/cloudflare/pick-image-delivery-url";

/**
 * Lấy URL hiển thị từ Cloudflare Images API (server-only).
 * Dùng khi chưa có NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH.
 */
export async function fetchCloudflareImageDeliveryUrl(
  imageId: string | null | undefined,
): Promise<string | null> {
  const id = imageId?.trim();
  if (!id) return null;

  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_IMAGES_API_TOKEN?.trim();
  if (!account || !token) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/images/v1/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      },
    );

    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      result?: { variants?: string[] };
    };

    if (!res.ok || !json.success) return null;
    return pickImageDeliveryUrl(json.result?.variants);
  } catch {
    return null;
  }
}
