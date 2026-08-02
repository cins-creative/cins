/**
 * Client-safe types for shop customer tags (no server-only imports).
 * Mirror of shapes used by `lib/shop/khach-hang.ts`.
 */

export type ShopKhachHangTag = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thuTu: number;
  macDinh: boolean;
};

export type ShopKhachHang = {
  buyerId: string;
  soDon: number;
  donGanNhatLuc: string;
  /** Mọi đơn đều `huy` → UI hiện nhạt. */
  chiDonHuy: boolean;
  tagIds: string[];
};
