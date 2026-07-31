import "server-only";

import { labelTinhThanh, normalizeTinhThanhForDb } from "@/lib/truong/contact";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Thông tin nhận hàng người mua tự khai (tái dùng cột hồ sơ). */
export type ShopNguoiNhan = {
  hoTen: string;
  soDienThoai: string;
  diaChi: string;
  /** Mã enum tỉnh/thành (`tinh_thanh_vn_enum`) hoặc "". */
  tinhThanh: string;
};

/** Snapshot ghi vào đơn — địa chỉ đầy đủ (chi tiết + tỉnh/thành) đã gộp sẵn. */
export type ShopNguoiNhanSnapshot = {
  hoTen: string;
  soDienThoai: string;
  diaChiDayDu: string;
  /** Số nhà / đường (không gộp). */
  diaChi?: string;
  phuongXa?: string;
  phuongXaCode?: string | null;
  /** Mã enum tỉnh/thành CINs. */
  tinhThanh?: string;
};

const MAX_HO_TEN = 80;
const MAX_SDT = 20;
const MAX_DIA_CHI = 280;
const SDT_RE = /^[0-9+()\-.\s]{6,20}$/;

/**
 * Đọc thông tin nhận hàng đã lưu của người mua (prefill form checkout).
 * `hoTen` fallback về tên hiển thị để đỡ phải gõ lại — người mua vẫn sửa được.
 */
export async function getNguoiNhan(userId: string): Promise<ShopNguoiNhan> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("ten_hien_thi, ho_ten_nhan, so_dien_thoai, dia_chi_chi_tiet, tinh_thanh")
    .eq("id", userId)
    .maybeSingle<{
      ten_hien_thi: string | null;
      ho_ten_nhan: string | null;
      so_dien_thoai: string | null;
      dia_chi_chi_tiet: string | null;
      tinh_thanh: string | null;
    }>();
  return {
    hoTen: data?.ho_ten_nhan?.trim() || data?.ten_hien_thi?.trim() || "",
    soDienThoai: data?.so_dien_thoai?.trim() || "",
    diaChi: data?.dia_chi_chi_tiet?.trim() || "",
    tinhThanh: (data?.tinh_thanh ?? "").trim(),
  };
}

/**
 * Chuẩn hóa + validate thông tin nhận hàng (mọi trường bắt buộc), lưu lại vào
 * hồ sơ người mua để lần sau tự điền, rồi trả snapshot để ghi vào đơn.
 * Ném lỗi `NGUOI_NHAN_REQUIRED` nếu thiếu / sai định dạng.
 */
export async function saveNguoiNhanAndSnapshot(
  userId: string,
  input: ShopNguoiNhan | null | undefined,
): Promise<ShopNguoiNhanSnapshot> {
  const hoTen = (input?.hoTen ?? "").trim().slice(0, MAX_HO_TEN);
  const soDienThoai = (input?.soDienThoai ?? "").trim().slice(0, MAX_SDT);
  const diaChi = (input?.diaChi ?? "").trim().slice(0, MAX_DIA_CHI);
  const tinhThanhCode = normalizeTinhThanhForDb(input?.tinhThanh);

  if (hoTen.length < 2) throw new Error("NGUOI_NHAN_REQUIRED");
  if (!SDT_RE.test(soDienThoai)) throw new Error("NGUOI_NHAN_REQUIRED");
  if (diaChi.length < 4) throw new Error("NGUOI_NHAN_REQUIRED");
  if (!tinhThanhCode) throw new Error("NGUOI_NHAN_REQUIRED");

  const admin = createServiceRoleClient();
  /* Lưu lại hồ sơ (không đụng visibility — giữ mặc định riêng tư). */
  await admin
    .from("user_nguoi_dung")
    .update({
      ho_ten_nhan: hoTen,
      so_dien_thoai: soDienThoai,
      dia_chi_chi_tiet: diaChi,
      tinh_thanh: tinhThanhCode,
    })
    .eq("id", userId);

  const tinhLabel = labelTinhThanh(tinhThanhCode);
  const diaChiDayDu = tinhLabel ? `${diaChi}, ${tinhLabel}` : diaChi;
  return { hoTen, soDienThoai, diaChiDayDu };
}
