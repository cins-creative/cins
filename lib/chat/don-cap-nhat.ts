import type { ChatDonCapNhat } from "@/lib/chat/types";

/**
 * Nhãn trạng thái đơn shop dùng trong body tin bump (`lib/shop/don-hang.ts`).
 * Giữ bản sao ở đây để client chat không kéo cả module shop.
 */
const TRANG_THAI_TU_NHAN: Record<string, string> = {
  Nháp: "nhap",
  "Chờ xác nhận": "cho_xac_nhan",
  "Đã nhận tiền": "da_nhan_tien",
  "Thanh toán khi nhận hàng": "da_giao_tai_su_kien",
  "Đã giao tại sự kiện": "da_giao_tai_su_kien",
  "Hoàn thành": "hoan_thanh",
  "Đã hủy": "huy",
};

/**
 * Tin bump đơn cũ chỉ có body = nhãn trạng thái (chưa có `ngu_canh.capNhat`).
 * Suy ra payload để vẫn render dạng thông báo, kèm lý do nếu body có ` — `.
 */
export function donCapNhatTuBody(body: string): ChatDonCapNhat | null {
  const text = body.trim();
  if (!text) return null;
  const [nhanRaw, ...rest] = text.split("—");
  const nhan = nhanRaw!.trim();
  const trangThai = TRANG_THAI_TU_NHAN[nhan];
  if (!trangThai) return null;
  const lyDo = rest.join("—").trim();
  return { trangThai, nhan, lyDo: lyDo || null, boi: null, luc: null };
}

/** Lý do hủy nằm trong `moTa` của card (tin bump cũ chưa có `capNhat.lyDo`). */
export function lyDoHuyTuMoTa(moTa?: string | null): string | null {
  for (const line of (moTa ?? "").split("\n")) {
    const hit = line.trim().match(/^Lý do hủy:\s*(.+)$/i);
    if (hit) return hit[1]!.trim() || null;
  }
  return null;
}

/** Body chỉ nhắc lại nội dung đã có trong thông báo → không render caption. */
export function bodyLaCapNhat(capNhat: ChatDonCapNhat, body: string): boolean {
  const text = body.trim();
  if (!text) return true;
  if (text === capNhat.nhan) return true;
  return text === `${capNhat.nhan} — ${capNhat.lyDo ?? ""}`.trim();
}

/** Câu mô tả hành động — «Bạn» khi chính người xem vừa thao tác. */
export function donCapNhatTieuDe(
  capNhat: ChatDonCapNhat,
  boiNguoiXem: boolean,
): string {
  switch (capNhat.trangThai) {
    case "huy":
      if (boiNguoiXem) return "Bạn đã hủy đơn này";
      if (capNhat.boi === "nguoi_mua") return "Người mua đã hủy đơn";
      if (capNhat.boi === "nguoi_ban") return "Người bán đã hủy đơn";
      return "Đơn đã bị hủy";
    case "da_nhan_tien":
      return boiNguoiXem
        ? "Bạn đã xác nhận nhận tiền"
        : "Người bán đã xác nhận nhận tiền";
    case "da_giao_tai_su_kien":
      return boiNguoiXem
        ? "Bạn đã xác nhận giao hàng"
        : "Người bán đã xác nhận giao hàng";
    case "hoan_thanh":
      return boiNguoiXem
        ? "Bạn đã hoàn thành đơn này"
        : "Người bán đã hoàn thành đơn";
    case "cho_xac_nhan":
      return "Đơn đang chờ người bán xác nhận";
    default:
      return `Đơn chuyển sang: ${capNhat.nhan}`;
  }
}

/** Sắc thái hiển thị: hủy (đỏ) · hoàn tất (xanh) · còn lại (trung tính). */
export function donCapNhatTone(
  capNhat: ChatDonCapNhat,
): "huy" | "xong" | "cho" {
  if (capNhat.trangThai === "huy") return "huy";
  if (
    capNhat.trangThai === "da_nhan_tien" ||
    capNhat.trangThai === "da_giao_tai_su_kien" ||
    capNhat.trangThai === "hoan_thanh"
  ) {
    return "xong";
  }
  return "cho";
}
