import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ShopTrangThaiHoatDong } from "@/lib/shop/types";

/**
 * Cổng gate gộp (nợ phí + tranh chấp) — tách biệt `tam_dong` của seller.
 * Quy tắc MVP:
 * - khoa: có kỳ phí qua_han HOẶC ≥5 tranh chấp mở / thua gần đây
 * - han_che: ≥3 tranh chấp mở
 * - canh_bao: ≥1 tranh chấp mở HOẶC có biên lai phí chờ xác nhận quá hạn nhẹ
 * - hoat_dong: còn lại
 */
export async function applyShopGateFromSignals(
  sellerId: string,
): Promise<ShopTrangThaiHoatDong> {
  const admin = createServiceRoleClient();

  const [{ count: openKn }, { count: quaHanPhi }] = await Promise.all([
    admin
      .from("shop_khieu_nai")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_ban", sellerId)
      .in("trang_thai", ["mo", "cho_phan_hoi", "dang_xu_ly", "da_phan_xu"]),
    admin
      .from("shop_phi_ky")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_ban", sellerId)
      .eq("trang_thai", "qua_han"),
  ]);

  const open = openKn ?? 0;
  const overdue = (quaHanPhi ?? 0) > 0;

  let next: ShopTrangThaiHoatDong = "hoat_dong";
  let lyDo: string | null = null;

  if (overdue || open >= 5) {
    next = "khoa";
    lyDo = overdue
      ? "Khóa do nợ phí nền tảng quá hạn."
      : "Khóa do nhiều tranh chấp chưa xử lý.";
  } else if (open >= 3) {
    next = "han_che";
    lyDo = "Hạn chế do nhiều tranh chấp đang mở.";
  } else if (open >= 1) {
    next = "canh_bao";
    lyDo = "Cảnh báo: có tranh chấp đang mở.";
  }

  await admin
    .from("shop_cua_hang")
    .update({
      trang_thai_hoat_dong: next,
      ly_do_khoa: lyDo,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id_nguoi_dung", sellerId)
    .eq("da_xoa", false);

  return next;
}

/** Chặn nhận đơn mới khi gate = khoa (han_che vẫn cho đơn nhưng UI cảnh báo). */
export async function assertShopGateNhanDon(
  sellerUserId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_cua_hang")
    .select("trang_thai_hoat_dong")
    .eq("id_nguoi_dung", sellerUserId)
    .eq("da_xoa", false)
    .maybeSingle<{ trang_thai_hoat_dong: string | null }>();
  const st = data?.trang_thai_hoat_dong ?? "hoat_dong";
  if (st === "khoa") throw new Error("SHOP_KHOA");
}
