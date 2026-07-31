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

/** CSV chung — dán/import thủ công lên web ĐVVC khác. */
const CSV_HEADERS = [
  "ma_don",
  "ho_ten",
  "so_dien_thoai",
  "dia_chi",
  "hang_hoa",
  "so_luong",
  "tong_tien",
  "tien_te",
] as const;

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

function buildVtpRows(dons: ShopDonHang[]): (string | number)[][] {
  return dons.map((don, i) => [
    i + 1,
    don.maDon ?? don.id.slice(0, 8),
    don.muaHoTen?.trim() || don.muaTen?.trim() || "",
    don.muaSoDienThoai?.trim() || "",
    don.muaDiaChi?.trim() || "",
    tenHangHoa(don),
    tongSoLuong(don),
    500,
    Math.round(don.tongTien),
    0,
    "Bưu kiện",
    "",
    "",
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

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Khối text copy nhanh (họ tên / SĐT / địa chỉ) — dán vào form web ĐVVC. */
export function formatDiaChiNhanCopy(don: ShopDonHang): string {
  const lines = [
    don.muaHoTen?.trim() || don.muaTen?.trim() || "",
    don.muaSoDienThoai?.trim() || "",
    don.muaDiaChi?.trim() || "",
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Sinh + tải file .xlsx theo mẫu ViettelPost cho các đơn đã chọn (client-side).
 */
export async function exportDonsToViettelPostXlsx(
  dons: ShopDonHang[],
): Promise<void> {
  if (dons.length === 0) return;
  const XLSX = await import("xlsx");
  const aoa: (string | number)[][] = [[...VTP_HEADERS], ...buildVtpRows(dons)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = VTP_COL_WIDTHS.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DANH SÁCH ĐƠN HÀNG");
  XLSX.writeFile(wb, `viettelpost-don-${timestampSlug()}.xlsx`);
}

/** CSV chung (UTF-8 BOM) — mở Excel / import thủ công lên ĐVVC khác. */
export function exportDonsToCsv(dons: ShopDonHang[]): void {
  if (dons.length === 0) return;
  const rows = dons.map((don) => [
    don.maDon ?? don.id.slice(0, 8),
    don.muaHoTen?.trim() || don.muaTen?.trim() || "",
    don.muaSoDienThoai?.trim() || "",
    don.muaDiaChi?.trim() || "",
    tenHangHoa(don),
    tongSoLuong(don),
    Math.round(don.tongTien),
    don.tienTe || "VND",
  ]);
  const body = [
    CSV_HEADERS.join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF" + body], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cins-don-ship-${timestampSlug()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
