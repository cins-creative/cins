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

/** Trục nhóm: 1 = phân loại 1 (group storefront); 2 = phân loại 2. */
export type ShopNhomTruc = 1 | 2;

/** Nhóm phân loại (`shop_nhom`) — có mô tả ngắn. */
export type ShopNhom = {
  id: string;
  truc: ShopNhomTruc;
  nhan: string;
  moTa: string | null;
  thuTu: number;
  taoLuc: string;
};

export type ShopSanPham = {
  id: string;
  ten: string;
  moTa: string | null;
  anhId: string | null;
  anhUrl: string | null;
  /** Nhãn phân loại / nhóm (denormalized từ `shop_nhom.nhan`). */
  phanLoai: string | null;
  /** Nhãn phân loại thứ hai (denormalized từ `shop_nhom.nhan` truc=2). */
  phanLoai2: string | null;
  /** FK `shop_nhom` truc=1. */
  idNhom?: string | null;
  /** FK `shop_nhom` truc=2. */
  idNhom2?: string | null;
  dangBan: boolean;
  /** Feature / nổi bật (`shop_san_pham.noi_bat`). */
  noiBat: boolean;
  bienThe: ShopBienThe[];
  taoLuc: string;
};

/** Tối đa sản phẩm được đánh Feature trên một cửa hàng. */
export const SHOP_FEATURE_MAX = 4;

export type ShopBangGiaDong = {
  id: string;
  idBienThe: string;
  /** Giá bán (niêm yết). */
  gia: number;
  /** Giá giảm / khuyến mãi — null = không giảm. */
  giaGiam: number | null;
};

/** Giá khách trả: ưu tiên `giaGiam` nếu có. */
export function shopGiaHieuLuc(dong: {
  gia: number;
  giaGiam?: number | null;
}): number {
  return dong.giaGiam != null ? dong.giaGiam : dong.gia;
}

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
  /** Nhãn phân loại 2 từ `shop_san_pham.phan_loai_2`. */
  phanLoai2: string | null;
  anhUrl: string | null;
  soLuongTon: number;
  /** Tổng số lượng đã bán (dòng đơn đã trừ kho). */
  soLuongBan: number;
  giaHienThi: number;
  tienTe: string;
  idBangGia: string | null;
  thuTu: number;
  hetHang: boolean;
};

/** Card sản phẩm trên storefront `/{slug}/shop` — catalog đang bán. */
export type ShopStorefrontItem = {
  sanPhamId: string;
  /** Biến thể dùng để hiện giá / thêm giỏ (giá tốt nhất). */
  idBienThe: string | null;
  /** Có khi biến thể còn gắn kiosk public — link bài (tuỳ chọn). */
  hangId: string | null;
  idCotMoc: string | null;
  postHref: string | null;
  tenSanPham: string;
  nhanBienThe: string | null;
  anhUrl: string | null;
  /** Null nếu chưa có dòng giá trong bảng giá nào. Giá khách trả (ưu tiên giảm). */
  giaHienThi: number | null;
  /**
   * Giá bán niêm yết khi đang giảm — hiện gạch ngang.
   * Null = không giảm (chỉ hiện `giaHienThi`).
   */
  giaGoc: number | null;
  tienTe: string;
  /** Tồn biến thể đang hiện giá (không phải tổng mọi biến thể). */
  soLuongTon: number;
  /** Tổng SL đã bán của biến thể đang hiện. */
  soLuongBan: number;
  hetHang: boolean;
  noiBat: boolean;
  /** Phân loại 1 — dùng group layout mặt tiền. */
  phanLoai: string | null;
  phanLoai2: string | null;
  /** FK `shop_nhom` truc=1 — để seller sửa mô tả nhóm. */
  idNhom: string | null;
  /** Mô tả ngắn nhóm phân loại 1 (`shop_nhom.mo_ta`). */
  phanLoaiMoTa: string | null;
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
  /** Giỏ theo post-kiosk — null khi giỏ storefront. */
  idCotMoc: string | null;
  /** Giỏ theo cửa hàng — null khi giỏ post-kiosk. */
  idCuaHang: string | null;
  dong: ShopGioDong[];
  tongTien: number;
  tienTe: string;
};

/** Dòng trong giỏ chung — kèm seller để nhóm theo cửa hàng. */
export type ShopGioChungDong = ShopGioDong & {
  idSanPham: string;
  /** Chủ sản phẩm (seller). */
  idNguoiBan: string;
  /** true khi sản phẩm/biến thể đã ngừng bán hoặc bị xóa. */
  ngungBan: boolean;
};

/** Một nhóm hàng cùng một cửa hàng trong giỏ chung — checkout theo nhóm. */
export type ShopGioChungNhom = {
  idNguoiBan: string;
  /** shop_cua_hang.id của seller — dùng cho checkout + link mặt tiền. */
  idCuaHang: string | null;
  tenCuaHang: string;
  /** slug user để link `/{slug}/shop`. */
  sellerSlug: string | null;
  avatarUrl: string | null;
  /** Seller đã có phương thức nhận tiền → mới gửi đơn được. */
  coThanhToan: boolean;
  dong: ShopGioChungDong[];
  tongTien: number;
  tienTe: string;
  /** Có ít nhất một dòng hết tồn / ngừng bán. */
  coVanDe: boolean;
};

/** Giỏ chung (giỏ chờ mua) — gom mọi cửa hàng, nhóm theo seller. */
export type ShopGioChung = {
  id: string | null;
  nhom: ShopGioChungNhom[];
  /** Tổng số dòng (badge). */
  tongSoDong: number;
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
  /** Phân loại 2 sản phẩm hiện tại (`shop_san_pham.phan_loai_2`). */
  phanLoai2?: string | null;
};

/** Snapshot STK/QR lúc tạo đơn — không đổi khi seller sửa TK sau. */
export type ShopThanhToanSnapshot = {
  idPhuongThuc: string | null;
  nganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
  qrAnhId: string | null;
  qrAnhUrl: string | null;
  /** Nội dung chuyển khoản gợi ý (= mã đơn). */
  noiDungCk: string;
  tongTien: number;
  tienTe: string;
};

export type ShopPhuongThucTt = {
  id: string;
  idCuaHang: string;
  nganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
  qrAnhId: string | null;
  qrAnhUrl: string | null;
  macDinh: boolean;
  kichHoat: boolean;
  thuTu: number;
  taoLuc: string;
};

/** Nhãn trục mặc định khi seller chưa đổi tên cột phân loại. */
export const SHOP_NHAN_PHAN_LOAI_DEFAULT = "Phân loại";
export const SHOP_NHAN_PHAN_LOAI_2_DEFAULT = "Phân loại 2";

/** Giới hạn mô tả ngắn nhóm phân loại (`shop_nhom.mo_ta`). */
export const SHOP_NHOM_MO_TA_MAX = 280;

export type ShopCuaHang = {
  id: string;
  idNguoiDung: string;
  ten: string | null;
  moTa: string | null;
  avatarId: string | null;
  avatarUrl: string | null;
  coverId: string | null;
  coverUrl: string | null;
  chinhSach: string | null;
  lienHe: string | null;
  /** Tên cột/trục phân loại 1 (`shop_cua_hang.nhan_phan_loai`). Null → mặc định UI. */
  nhanPhanLoai: string | null;
  /** Tên cột/trục phân loại 2 (`shop_cua_hang.nhan_phan_loai_2`). */
  nhanPhanLoai2: string | null;
  phuongThucTt: ShopPhuongThucTt[];
  /** Có ≥1 phương thức nhận tiền đang bật. */
  sanSangNhanDon: boolean;
  taoLuc: string;
  capNhatLuc: string;
};

export function resolveShopNhanPhanLoai(
  shop: Pick<ShopCuaHang, "nhanPhanLoai"> | null | undefined,
): string {
  return shop?.nhanPhanLoai?.trim() || SHOP_NHAN_PHAN_LOAI_DEFAULT;
}

export function resolveShopNhanPhanLoai2(
  shop: Pick<ShopCuaHang, "nhanPhanLoai2"> | null | undefined,
): string {
  return shop?.nhanPhanLoai2?.trim() || SHOP_NHAN_PHAN_LOAI_2_DEFAULT;
}

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
  /** Snapshot nhận tiền lúc tạo đơn (`mua_ngay`). */
  thanhToanSnapshot?: ShopThanhToanSnapshot | null;
  /** Ảnh biên lai chuyển khoản buyer đính kèm lúc gửi đơn (giỏ chung). */
  bienLaiAnhUrl?: string | null;
  bienLaiAnhId?: string | null;
};

/** Hàng gắn bài quầy — haystack tìm + card catalog khi Search hàng. */
export type ShopQuayHangSearch = {
  hangId: string;
  idBienThe: string;
  idSanPham: string;
  tenSanPham: string;
  nhanBienThe: string;
  phanLoai: string | null;
  phanLoai2: string | null;
  anhUrl: string | null;
  soLuongTon: number;
  soLuongBan: number;
  giaHienThi: number;
  tienTe: string;
  hetHang: boolean;
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
  /** Sản phẩm gắn `shop_post_hang` trên cột mốc — haystack tìm kiếm. */
  hangSearch?: ShopQuayHangSearch[];
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
