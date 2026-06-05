import { fetchCloudflareImageDeliveryUrl } from "@/lib/cloudflare/fetch-image-delivery-url";
import {
  getCfImageUrlWithFallbacks,
  type CfImageVariant,
} from "@/lib/truong/images";

/**
 * URL ảnh trường: ưu tiên build từ account hash (0ms), chỉ gọi CF API khi thiếu hash.
 */
export function resolveTruongImageSrcSync(
  imageId: string | null | undefined,
  variants: CfImageVariant[],
): string | null {
  return getCfImageUrlWithFallbacks(imageId, variants);
}

export async function resolveTruongImageSrc(
  imageId: string | null | undefined,
  variants: CfImageVariant[],
): Promise<string | null> {
  const direct = getCfImageUrlWithFallbacks(imageId, variants);
  if (direct) return direct;
  return fetchCloudflareImageDeliveryUrl(imageId);
}
