import {
  getCfImageUrl,
  getCfImageUrlWithFallbacks,
  type CfImageVariant,
} from "@/lib/truong/images";
import type { TruongHinhAnh } from "@/lib/truong/types";

/** Variant gallery org — `grid`/`gridsm` trước (CINS_IMPLEMENTATION §4). */
export const GALLERY_CF_VARIANTS: CfImageVariant[] = [
  "grid",
  "gridsm",
  "public",
];

export function hinhAnhDisplayUrlCandidates(
  img: Pick<TruongHinhAnh, "cloudflare_id" | "src">,
): string[] {
  const out: string[] = [];
  const id = img.cloudflare_id?.trim();
  if (id) {
    for (const variant of GALLERY_CF_VARIANTS) {
      const url = getCfImageUrl(id, variant);
      if (url && !out.includes(url)) out.push(url);
    }
  }
  const direct = img.src?.trim();
  if (direct && !out.includes(direct)) out.push(direct);
  return out;
}

export function hinhAnhDisplayUrl(
  img: Pick<TruongHinhAnh, "cloudflare_id" | "src">,
): string | null {
  const fromId = getCfImageUrlWithFallbacks(
    img.cloudflare_id,
    GALLERY_CF_VARIANTS,
  );
  if (fromId) return fromId;
  return img.src?.trim() || null;
}
