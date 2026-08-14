/** Asset decoy — Open image / Save bám tấm này, không phải ảnh hàng. */
export const SHOP_DECOY_SRC = "/shop-decoy.png";

/** Chữ phủ lightbox / preview: tên shop + URL Journey. */
export function shopProtectWatermarkText(opts: {
  shopTen?: string | null;
  ownerSlug?: string | null;
}): string {
  const slug = opts.ownerSlug?.trim() || "";
  const ten = opts.shopTen?.trim() || "";
  const url = slug ? `cins.vn/${slug}` : "cins.vn";
  if (ten && ten.toLowerCase() !== slug.toLowerCase()) {
    return `${ten} · ${url}`;
  }
  return url;
}
