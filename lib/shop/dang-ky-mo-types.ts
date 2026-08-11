/** Types admin lead mở shop — client-safe (không server-only). */

import type {
  ShopDangKyMoHinhThuc,
  ShopDangKyMoKenh,
  ShopDangKyMoTrangThai,
} from "@/lib/shop/dang-ky-mo-constants";

export type ShopDangKyMoAdminItem = {
  id: string;
  tenShop: string;
  tenLienHe: string | null;
  loaiHang: string[];
  hinhThucBan: ShopDangKyMoHinhThuc | null;
  resourceLinks: string[];
  ghiChu: string | null;
  kenhLienHe: ShopDangKyMoKenh;
  lienHeGiaTri: string;
  email: string;
  nganHang: string | null;
  soTaiKhoan: string | null;
  tenChuTk: string | null;
  daCoTaiKhoan: boolean;
  linkProfileCins: string | null;
  nguoiGioiThieu: string | null;
  trangThai: ShopDangKyMoTrangThai;
  ghiChuNoiBo: string | null;
  idNguoiDung: string | null;
  idCuaHang: string | null;
  nguon: string | null;
  taoLuc: string;
  capNhatLuc: string;
};
