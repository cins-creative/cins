/** URL storefront công khai — client-safe (không import server-only). */

const MAX_SHOP_SLUG_LEN = 64;

/** Segment route bị reserve — không dùng làm shopSlug. */
export const SHOP_SLUG_RESERVED = new Set(["loai"]);

/** Slugify tên cửa hàng (cùng kiểu org: NFD, đ→d, [a-z0-9-]). */
export function slugifyShopName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SHOP_SLUG_LEN);
}

/**
 * Segment URL storefront từ tên shop.
 * Tên trống / slugify rỗng / trùng reserve → fallback ownerSlug.
 */
export function shopSlugFromTen(
  ten: string | null | undefined,
  ownerSlug: string,
): string {
  const fallback = ownerSlug.trim().toLowerCase() || "shop";
  const fromTen = slugifyShopName(ten?.trim() || "");
  if (!fromTen || SHOP_SLUG_RESERVED.has(fromTen)) return fallback;
  return fromTen;
}

/** Canonical storefront — `/{ownerSlug}/shop/{shopSlug}`. */
export function shopPublicHref(ownerSlug: string, shopSlug: string): string {
  return `/${encodeURIComponent(ownerSlug.trim())}/shop/${encodeURIComponent(shopSlug.trim())}`;
}

/** Entry cũ / tab Shop — `/{ownerSlug}/shop` (server redirect → canonical). */
export function shopEntryHref(ownerSlug: string): string {
  return `/${encodeURIComponent(ownerSlug.trim())}/shop`;
}

/** Trang loại hàng — `/{slug}/shop/{shopSlug}/loai/{nhomId}`. */
export function shopLoaiHref(
  ownerSlug: string,
  shopSlug: string,
  nhomId: string,
): string {
  return `${shopPublicHref(ownerSlug, shopSlug)}/loai/${encodeURIComponent(nhomId.trim())}`;
}

/** Trang loại + chọn sẵn mẫu (`?mau=` = sanPhamId). */
export function shopLoaiMauHref(
  ownerSlug: string,
  shopSlug: string,
  nhomId: string,
  sanPhamId: string,
): string {
  const base = shopLoaiHref(ownerSlug, shopSlug, nhomId);
  const id = sanPhamId.trim();
  if (!id) return base;
  return `${base}?mau=${encodeURIComponent(id)}`;
}

/** Owner setup / quản lý cửa hàng — trang /ban-hang/cua-hang. */
export function shopSetupHref(_slug?: string): string {
  return "/ban-hang/cua-hang";
}
