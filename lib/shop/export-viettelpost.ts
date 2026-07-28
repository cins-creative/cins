import type { ShopDonHang } from "@/lib/shop/types";

/**
 * Cột file mẫu import đơn ViettelPost (viettelpost.vn → Tạo đơn → Nhập Excel).
 * Giữ đúng tên + thứ tự cột để upload thẳng; (*) là trường VTP bắt buộc.
 */
const VTP_HEADERS = [
  "STT",
  "Mã đơn hàng",
  "Tên người nhận (*)",
  "Số ĐT người nhận (*)",
  "Địa chỉ nhận (*)",
  "Tên hàng hóa (*)",
  "Số lượng",
  "Trọng lượng (gram) (*)",
  "Giá trị hàng (VND)",
  "Tiền thu hộ COD (VND)",
  "Loại hàng hóa (*)",
  "Tính chất hàng hóa đặc biệt",
  "Dịch vụ (*)",
  "Dịch vụ cộng thêm",
  "Dài (cm)",
  "Rộng (cm)",
  "Cao (cm)",
  "Người trả cước",
  "Thu tiền xem hàng",
  "Yêu cầu khác",
  "Thời gian hẹn lấy",
  "Thời gian giao (*)",
] as const;

/** Bề rộng cột (ký tự) cho dễ đọc khi mở file. */
const VTP_COL_WIDTHS = [
  5, 18, 22, 16, 42, 40, 8, 12, 14, 14, 14, 20, 14, 16, 8, 8, 8, 16, 14, 20, 16,
  16,
];

function tenHangHoa(don: ShopDonHang): string {
  return don.dong
    .map((d) => {
      const nhan =
        d.nhanSnapshot?.trim() && d.nhanSnapshot.trim() !== "Mặc định"
          ? ` (${d.nhanSnapshot.trim()})`
          : "";
      return `${d.tenSnapshot}${nhan} x${d.soLuong}`;
    })
    .join(", ");
}

function tongSoLuong(don: ShopDonHang): number {
  return don.dong.reduce((sum, d) => sum + d.soLuong, 0);
}

function buildRows(dons: ShopDonHang[]): (string | number)[][] {
  return dons.map((don, i) => [
    i + 1,
    don.maDon ?? don.id.slice(0, 8),
    don.muaHoTen?.trim() || don.muaTen?.trim() || "",
    don.muaSoDienThoai?.trim() || "",
    don.muaDiaChi?.trim() || "",
    tenHangHoa(don),
    tongSoLuong(don),
    500, // trọng lượng mặc định (gram) — người bán chỉnh lại nếu cần
    Math.round(don.tongTien),
    0, // COD = 0 (người mua đã chuyển khoản trước + gửi biên lai)
    "Bưu kiện",
    "",
    "", // Dịch vụ — người bán chọn trên VTP
    "",
    "",
    "",
    "",
    "Người gửi trả",
    "",
    "",
    "",
    "",
  ]);
}

function timestampSlug(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * Sinh + tải file .xlsx theo mẫu ViettelPost cho các đơn đã chọn (client-side).
 * Dùng dynamic import SheetJS để không nặng bundle chính.
 */
export async function exportDonsToViettelPostXlsx(
  dons: ShopDonHang[],
): Promise<void> {
  if (dons.length === 0) return;
  const XLSX = await import("xlsx");
  const aoa: (string | number)[][] = [[...VTP_HEADERS], ...buildRows(dons)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = VTP_COL_WIDTHS.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DANH SÁCH ĐƠN HÀNG");
  XLSX.writeFile(wb, `viettelpost-don-${timestampSlug()}.xlsx`);
}
