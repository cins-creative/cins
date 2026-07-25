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
