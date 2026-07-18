/** L33 — Shop UGC types (không payment gateway). */

import type { MilestoneItem } from "@/components/journey/milestone-types";

export type ShopLoaiDon = "mua_ngay" | "dat_truoc_nhan_su_kien";

export type ShopTrangThaiDon =
  | "nhap"
  | "cho_xac_nhan"
  | "da_nhan_tien"
  | "da_giao_tai_su_kien"
  | "huy";

export type ShopTrangThaiQuay = "cho_xu_ly" | "da_duyet" | "tu_choi";

export type ShopEvidenceKind = "link" | "file" | "text";

export type ShopEvidence = {
  label: string;
  kind: ShopEvidenceKind;
  href?: string;
  detail?: string;
};

export type ShopBienThe = {
  id: string;
  idSanPham: string;
  nhan: string;
  sku: string | null;
  soLuongTon: number;
  anhId: string | null;
  anhUrl: string | null;
};

export type ShopSanPham = {
  id: string;
  ten: string;
  moTa: string | null;
  anhId: string | null;
  anhUrl: string | null;
  /** Nhãn phân loại / nhóm (seller tự đặt). */
  phanLoai: string | null;
  dangBan: boolean;
  bienThe: ShopBienThe[];
  taoLuc: string;
};

export type ShopBangGiaDong = {
  id: string;
  idBienThe: string;
  gia: number;
};

export type ShopBangGia = {
  id: string;
  ten: string;
  tienTe: string;
  ghiChu: string | null;
  dong: ShopBangGiaDong[];
  taoLuc: string;
};

export type ShopPostHangItem = {
  id: string;
  idBienThe: string;
  idSanPham: string;
  tenSanPham: string;
  nhanBienThe: string;
  /** Nhãn phân loại từ `shop_san_pham.phan_loai`. */
  phanLoai: string | null;
  anhUrl: string | null;
  soLuongTon: number;
  giaHienThi: number;
  tienTe: string;
  idBangGia: string | null;
  thuTu: number;
  hetHang: boolean;
};

export type ShopGioDong = {
  idBienThe: string;
  soLuong: number;
  tenSanPham: string;
  nhanBienThe: string;
  giaHienThi: number;
  tienTe: string;
  anhUrl: string | null;
  soLuongTon: number;
};

export type ShopGio = {
  id: string | null;
  idCotMoc: string;
  dong: ShopGioDong[];
  tongTien: number;
  tienTe: string;
};

export type ShopDonHangDong = {
  id: string;
  idBienThe: string | null;
  tenSnapshot: string;
  nhanSnapshot: string | null;
  soLuong: number;
  giaDonVi: number;
  /** Ảnh biến thể / sản phẩm hiện tại (không snapshot — có thể null nếu đã xóa). */
  anhUrl?: string | null;
  /** Phân loại sản phẩm hiện tại (`shop_san_pham.phan_loai`). */
  phanLoai?: string | null;
};

export type ShopDonHang = {
  id: string;
  /** Mã đơn công khai (TENNGUOIMUA-12345). */
  maDon: string | null;
  idNguoiMua: string;
  idNguoiBan: string;
  idCotMoc: string | null;
  idSuKien: string | null;
  loaiDon: ShopLoaiDon;
  trangThai: ShopTrangThaiDon;
  tienTe: string;
  tongTien: number;
  ghiChu: string | null;
  daTruKho: boolean;
  dong: ShopDonHangDong[];
  muaTen?: string | null;
  banTen?: string | null;
  taoLuc: string;
  xacNhanLuc: string | null;
  /** Snapshot chấp nhận rủi ro chuyển khoản (`mua_ngay`). */
  nguoiMuaChapNhanLuc?: string | null;
  nguoiMuaChapNhanVanBan?: string | null;
  nguoiMuaChapNhanPhienBan?: string | null;
};

export type ShopQuaySuKien = {
  id: string;
  idSuKien: string;
  idNguoiDung: string;
  idCotMoc: string | null;
  bangChung: ShopEvidence[];
  trangThai: ShopTrangThaiQuay;
  lyDoTuChoi: string | null;
  nguoiDungTen?: string | null;
  nguoiDungSlug?: string | null;
  nguoiDungAvatarUrl?: string | null;
  /** Meta sự kiện — list “quầy của tôi”. */
  suKienTen?: string | null;
  suKienBatDau?: string | null;
  orgTen?: string | null;
  taoLuc: string;
  /**
   * Snapshot cột mốc gắn quầy — hydrate khi list có `idCotMoc`
   * (tab Sự kiện xem bài đã duyệt; tab Quản lý duyệt chờ xử lý).
   */
  cotMoc?: MilestoneItem | null;
};

export const SHOP_LOAI_DON_LABEL: Record<ShopLoaiDon, string> = {
  mua_ngay: "Mua ngay — thanh toán luôn",
  dat_truoc_nhan_su_kien: "Đặt trước — thanh toán sau",
};

export const SHOP_TRANG_THAI_DON_LABEL: Record<ShopTrangThaiDon, string> = {
  nhap: "Nháp",
  cho_xac_nhan: "Chờ xác nhận",
  da_nhan_tien: "Đã nhận tiền",
  da_giao_tai_su_kien: "Thanh toán khi nhận hàng",
  huy: "Đã hủy",
};

export const SHOP_TRANG_THAI_QUAY_LABEL: Record<ShopTrangThaiQuay, string> = {
  cho_xu_ly: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  tu_choi: "Đã rút / từ chối",
};
