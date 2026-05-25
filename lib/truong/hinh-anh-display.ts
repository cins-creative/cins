import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import type { TruongHinhAnh } from "@/lib/truong/types";

export function hinhAnhDisplayUrl(
  img: Pick<TruongHinhAnh, "cloudflare_id" | "src">,
): string | null {
  const direct = img.src?.trim();
  if (direct) return direct;
  return getCfImageUrlWithFallbacks(img.cloudflare_id, [
    "medium",
    "public",
    "cover",
  ]);
}
