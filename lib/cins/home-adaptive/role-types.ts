/** Client-safe types for home role modules (no server-only imports). */

export type HomeDonHangItem = {
  id: string;
  maDon: string;
  title: string;
  /** Dòng phụ gọn — mã đơn (không kèm giá; giá tách cột). */
  sub: string;
  trangThai: string;
  trangThaiLabel: string;
  href: string;
  avatarUrl: string | null;
  tongTien: number;
  tienTe: string;
  /** Chuỗi đã format sẵn cho UI (vd. `420.000 ₫`). */
  tongTienLabel: string;
  /** Seller: phân nhánh action xác nhận tiền vs giao SK. */
  loaiDon: string | null;
};
