/** Client-safe — đổi variant trên URL Cloudflare Images (imagedelivery.net). */

const CF_DELIVERY_RE =
  /^https:\/\/imagedelivery\.net\/([^/]+)\/([^/]+)\/([^/?#]+)/i;

export function swapCfImageVariant(url: string, variant: string): string {
  const m = url.match(CF_DELIVERY_RE);
  if (!m) return url;
  return `https://imagedelivery.net/${m[1]}/${m[2]}/${variant}`;
}

export function isCfDeliveryUrl(url: string): boolean {
  return CF_DELIVERY_RE.test(url);
}

/** `sizes` cho lưới gallery World Journey / Journey (4 → 3 → 2 cột). */
export const GALLERY_GRID_IMAGE_SIZES =
  "(max-width: 991px) 50vw, (max-width: 1400px) 33vw, 25vw";

export function galleryGridAssetFromCfUrl(url: string): {
  src: string;
  srcSet: string;
  width: number;
  height: number;
} | null {
  if (!isCfDeliveryUrl(url)) return null;
  const src = swapCfImageVariant(url, "grid");
  const sm = swapCfImageVariant(url, "gridsm");
  return {
    src,
    srcSet: `${sm} 400w, ${src} 640w`,
    width: 640,
    height: 360,
  };
}
