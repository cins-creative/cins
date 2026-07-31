import type { ShopDonHang } from "@/lib/shop/types";

function tenHangLines(don: ShopDonHang): string {
  return don.dong
    .map((d) => {
      const nhan =
        d.nhanSnapshot?.trim() && d.nhanSnapshot.trim() !== "Mặc định"
          ? ` — ${d.nhanSnapshot.trim()}`
          : "";
      return `• ${d.tenSnapshot}${nhan} × ${d.soLuong}`;
    })
    .join("<br/>");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mở cửa sổ in phiếu đóng gói (mã đơn + người nhận + hàng). */
export function printPhieuDongGoi(don: ShopDonHang): void {
  const ma = esc(don.maDon?.trim() || don.id.slice(0, 8));
  const hoTen = esc(don.muaHoTen?.trim() || don.muaTen?.trim() || "—");
  const sdt = esc(don.muaSoDienThoai?.trim() || "—");
  const diaChi = esc(don.muaDiaChi?.trim() || "—");
  const hang = tenHangLines(don);
  const tong = `${don.tongTien.toLocaleString("vi-VN")} ${esc(don.tienTe || "VND")}`;
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<title>Phiếu đóng gói ${ma}</title>
<style>
  @page { margin: 12mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #111; margin: 0; padding: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
  .box { border: 1px solid #222; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
  .box h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #666; margin: 0 0 8px; }
  .line { margin: 4px 0; font-size: 14px; }
  .line strong { font-size: 15px; }
  .hang { font-size: 13px; line-height: 1.5; }
  .foot { font-size: 11px; color: #777; margin-top: 18px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Phiếu đóng gói</h1>
  <p class="meta">CINs · ${ma} · ${new Date().toLocaleString("vi-VN")}</p>
  <div class="box">
    <h2>Người nhận</h2>
    <p class="line"><strong>${hoTen}</strong></p>
    <p class="line">SĐT: ${sdt}</p>
    <p class="line">${diaChi}</p>
  </div>
  <div class="box">
    <h2>Hàng trong kiện</h2>
    <div class="hang">${hang || "—"}</div>
    <p class="line" style="margin-top:10px">Tổng đơn: <strong>${tong}</strong></p>
  </div>
  <p class="foot">Dán phiếu lên kiện · tạo vận đơn trên web ĐVVC (SPX / Viettel / …). CINs không liên kết ĐVVC.</p>
  <script>window.onload=function(){window.focus();window.print();}</script>
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
  if (!w) {
    throw new Error("POPUP_BLOCKED");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
