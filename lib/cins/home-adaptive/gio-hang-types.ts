/** Client-safe — item «Giỏ hàng của bạn». */

export type GioHangHomeItem = {
  idBienThe: string;
  tenSanPham: string;
  nhanBienThe: string;
  soLuong: number;
  giaHienThi: number | null;
  anhUrl: string | null;
  tenCuaHang: string;
};

export function formatGioHangGia(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
