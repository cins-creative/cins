/** DTO hub `/cua-hang` — client-safe (không `server-only`). */

/** Loại / mẫu hiện trên card hoặc kết quả search hàng. */
export type PublicShopListingHang = {
  id: string;
  ten: string;
  anhUrl: string | null;
  /** Có khi là mẫu (`shop_san_pham`) gắn loại. */
  idNhom?: string | null;
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
};
