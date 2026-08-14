/** DTO hub `/shopping` — client-safe (không `server-only`). */

import type { ShopThumbFit } from "@/lib/shop/anh-thumb-fit";

export type ShopListingBrowseMode = "shop" | "mat-hang" | "hang";

/** Loại / mẫu hiện trên card hoặc kết quả search hàng. */
export type PublicShopListingHang = {
  id: string;
  ten: string;
  anhUrl: string | null;
  /** Ô vuông listing — mẫu từ `shop_san_pham.anh_thumb_fit`; loại kế thừa mẫu. */
  anhThumbFit?: ShopThumbFit;
  /** Mô tả loại (`shop_nhom.mo_ta`) — dùng card «Mặt hàng». */
  moTa?: string | null;
  /** Có khi là mẫu (`shop_san_pham`) gắn loại. */
  idNhom?: string | null;
  /** Biến thể mặc định để thêm giỏ từ hub (chỉ mẫu). */
  idBienThe?: string | null;
  /** Tồn biến thể mặc định — 0 = hết hàng. */
  soLuongTon?: number;
  /** Tên loại (`shop_nhom.nhan`) — gắn lên mẫu để card Hàng biết thuộc loại nào. */
  tenLoai?: string | null;
  /** Giá gợi ý — `shop_nhom.gia_mac_dinh` (loại) hoặc kế thừa từ loại (mẫu). */
  giaHienThi?: number | null;
  tienTe?: string;
  /** Feature loại (`shop_nhom.noi_bat`) — mẫu thường false. */
  noiBat?: boolean;
  /** Tổng SL đã bán (đơn hoàn thành) — loại = sum mẫu. */
  soLuongBan?: number;
  /** Hết tồn mọi biến thể đang bán thuộc loại. */
  hetHang?: boolean;
  /** Slug danh mục canonical (`shop_danh_muc`) — null nếu chưa map. */
  danhMucSlug?: string | null;
  /**
   * Facet gắn loại — key = slug facet (`fandom`, `chat-lieu`),
   * value = slug giá trị. Chỉ có trên loại (`kind=loai`).
   */
  facets?: Record<string, string[]>;
  /** Loại/mẫu nằm trong combo đang chạy của shop. */
  coCombo?: boolean;
  /** Nhãn gợi ý trên card hub — vd. «combo -35k», «combo -15%». */
  comboTag?: string | null;
};

export type PublicShopListingItem = {
  id: string;
  ten: string;
  moTa: string | null;
  href: string;
  shopSlug: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  ownerSlug: string;
  /** `user_nguoi_dung.id` của chủ shop — ẩn nút giỏ khi xem shop mình. */
  ownerId?: string;
  ownerTen: string | null;
  dangTamDong: boolean;
  tamDongLyDo: string | null;
  /** Tối đa 3 loại trên card khi không search: Feature → thường. */
  featuredHang: PublicShopListingHang[];
  /** Loại hàng (nhom) — search + hiện khi khớp từ khóa. */
  catalogHang: PublicShopListingHang[];
  /** Mẫu đang bán — search + hiện khi khớp từ khóa. */
  catalogMau: PublicShopListingHang[];
  /** Chuỗi gộp (shop + loại + mẫu) — filter client. */
  searchHaystack: string;
  /** Shop có voucher công khai đang chạy. */
  coVoucher?: boolean;
  /** Shop có combo đang chạy (discount filter tab Shop — không cần scan catalog). */
  coCombo?: boolean;
  /** Dòng ticker voucher trên card shop — vd. «Voucher giảm giá 30k từ 400k». */
  voucherTickerLines?: string[];
};
