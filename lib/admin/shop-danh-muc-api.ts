/**
 * API admin danh mục hàng — `/admin/**` và `/api/admin/**` giữ tiếng Việt
 * (PLAN_URL_ENGLISH: ngoài phạm vi, middleware không 308).
 * Không dùng `/api/admin/shop/catalog` — route đó không tồn tại.
 */
export const ADMIN_SHOP_DANH_MUC_API = "/api/admin/shop/danh-muc";
export const ADMIN_SHOP_DANH_MUC_HANG_CHO_API =
  "/api/admin/shop/danh-muc/hang-cho";

export function adminShopDanhMucItemApi(id: string): string {
  return `${ADMIN_SHOP_DANH_MUC_API}/${encodeURIComponent(id)}`;
}
