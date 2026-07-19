/** URL storefront công khai — client-safe (không import server-only). */

export function shopPublicHref(slug: string): string {
  return `/${encodeURIComponent(slug)}/shop`;
}

/** Owner setup / quản lý cửa hàng — trang /ban-hang/cua-hang. */
export function shopSetupHref(_slug?: string): string {
  return "/ban-hang/cua-hang";
}
