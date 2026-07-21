/** URL storefront công khai — client-safe (không import server-only). */

export function shopPublicHref(slug: string): string {
  return `/${encodeURIComponent(slug)}/shop`;
}

/** Trang loại hàng — `/{slug}/shop/loai/{nhomId}` (`nhomId` = uuid hoặc `khac`). */
export function shopLoaiHref(slug: string, nhomId: string): string {
  return `/${encodeURIComponent(slug.trim())}/shop/loai/${encodeURIComponent(nhomId.trim())}`;
}

/** Trang loại + chọn sẵn mẫu (`?mau=` = sanPhamId). */
export function shopLoaiMauHref(
  slug: string,
  nhomId: string,
  sanPhamId: string,
): string {
  const base = shopLoaiHref(slug, nhomId);
  const id = sanPhamId.trim();
  if (!id) return base;
  return `${base}?mau=${encodeURIComponent(id)}`;
}

/** Owner setup / quản lý cửa hàng — trang /ban-hang/cua-hang. */
export function shopSetupHref(_slug?: string): string {
  return "/ban-hang/cua-hang";
}
