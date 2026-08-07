import "server-only";

import { anHanConHieuLuc, getSoNgayAnHanTuKhai } from "@/lib/billing/an-han";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ShopTrangThaiHoatDong } from "@/lib/shop/types";

/**
 * Prefix `ly_do_khoa` khi admin khóa tay (P0 B2, chưa ALTER cột riêng).
 * `applyShopGateFromSignals` không được ghi đè / mở khóa khi thấy prefix này.
 */
export const SHOP_LY_DO_KHOA_ADMIN_PREFIX = "[ADMIN] " as const;

/** Hằng số tạm — sẽ đưa vào /admin/tai-chinh ở P2 (Q4). */
const GATE_MIN_DON = 10;
const GATE_TI_LE_HAN_CHE = 0.2;
const GATE_TI_LE_KHOA = 0.4;
/** Tối đa khiếu nại đang mở / người mua (chống spam). */
export const SHOP_BUYER_TOI_DA_KHIEU_NAI_MO = 3;

const KN_OPEN = ["mo", "cho_phan_hoi", "dang_xu_ly", "da_phan_xu"] as const;

/**
 * Đơn đã từng nhận tiền (đủ điều kiện khiếu nại hợp lệ).
 * Đơn `huy` từ `cho_xac_nhan` chưa nhận tiền → không đếm (P0 A5).
 */
const DON_DA_NHAN_TIEN = [
  "da_nhan_tien",
  "cho_lay_hang",
  "dang_giao",
  "da_giao_tai_su_kien",
  "hoan_thanh",
  "hoan_tra",
] as const;

export function isAdminManualLock(lyDoKhoa: string | null | undefined): boolean {
  return Boolean(lyDoKhoa?.startsWith(SHOP_LY_DO_KHOA_ADMIN_PREFIX));
}

/**
 * Cổng gate gộp (nợ phí + tranh chấp) — tách biệt `tam_dong` của seller.
 * P0 A5: đếm khiếu nại theo **tỉ lệ** trên đơn đã nhận tiền.
 * P0 B2: không ghi đè khóa thủ công `[ADMIN]`.
 * Nhóm A / Q1b: nợ quá hạn đọc `cins_hoa_don`; ân hạn tự khai → `han_che` (không khoá cứng).
 */
export async function applyShopGateFromSignals(
  sellerId: string,
): Promise<ShopTrangThaiHoatDong> {
  const admin = createServiceRoleClient();

  const { data: shopRow } = await admin
    .from("shop_cua_hang")
    .select("trang_thai_hoat_dong, ly_do_khoa")
    .eq("id_nguoi_dung", sellerId)
    .eq("da_xoa", false)
    .maybeSingle<{
      trang_thai_hoat_dong: string | null;
      ly_do_khoa: string | null;
    }>();

  const manualLock = isAdminManualLock(shopRow?.ly_do_khoa);
  if (manualLock) {
    /* Giữ khoa + lý do admin; vẫn có thể nâng mức nếu đang thấp hơn — nhưng không mở */
    return "khoa";
  }

  const [{ count: tongDonNhanTien }, knRes, { data: dv }] = await Promise.all([
    admin
      .from("shop_don_hang")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_ban", sellerId)
      .in("trang_thai", [...DON_DA_NHAN_TIEN]),
    admin
      .from("shop_khieu_nai")
      .select("id, id_don_hang")
      .eq("id_nguoi_ban", sellerId)
      .in("trang_thai", [...KN_OPEN])
      .limit(200),
    admin
      .from("cins_dich_vu")
      .select("id")
      .eq("loai", "shop_phi")
      .eq("tham_chieu_id", sellerId)
      .maybeSingle<{ id: string }>(),
  ]);

  /* Q1b: ưu tiên hoá đơn hub; fallback shop_phi_ky nếu chưa dual-write. */
  let overdue = false;
  let overdueAllAnHan = false;
  if (dv?.id) {
    const { data: hdRows } = await admin
      .from("cins_hoa_don")
      .select("id, tu_khai_da_tra_luc, trang_thai")
      .eq("id_dich_vu", dv.id)
      .eq("trang_thai", "qua_han");
    const list = (hdRows ?? []) as Array<{
      id: string;
      tu_khai_da_tra_luc: string | null;
      trang_thai: string;
    }>;
    if (list.length > 0) {
      overdue = true;
      const soNgay = await getSoNgayAnHanTuKhai();
      const now = new Date();
      overdueAllAnHan = list.every((h) =>
        anHanConHieuLuc({ tuKhaiDaTraLuc: h.tu_khai_da_tra_luc }, soNgay, now),
      );
    }
  }
  if (!overdue) {
    const { count: quaHanPhi } = await admin
      .from("shop_phi_ky")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_ban", sellerId)
      .eq("trang_thai", "qua_han");
    overdue = (quaHanPhi ?? 0) > 0;
    overdueAllAnHan = false;
  }

  const donBase = tongDonNhanTien ?? 0;

  /* Chỉ đếm KN gắn đơn đã từng nhận tiền */
  const knRows = (knRes.data ?? []) as Array<{
    id: string;
    id_don_hang: string;
  }>;
  let openKnHopLe = 0;
  if (knRows.length > 0) {
    const donIds = [...new Set(knRows.map((k) => k.id_don_hang))];
    const { data: dons } = await admin
      .from("shop_don_hang")
      .select("id, trang_thai, xac_nhan_luc")
      .in("id", donIds);
    const ok = new Set<string>();
    for (const d of (dons ?? []) as Array<{
      id: string;
      trang_thai: string;
      xac_nhan_luc: string | null;
    }>) {
      if (
        d.xac_nhan_luc ||
        DON_DA_NHAN_TIEN.includes(
          d.trang_thai as (typeof DON_DA_NHAN_TIEN)[number],
        )
      ) {
        if (d.trang_thai === "huy" && !d.xac_nhan_luc) continue;
        ok.add(d.id);
      }
    }
    openKnHopLe = knRows.filter((k) => ok.has(k.id_don_hang)).length;
  }

  let next: ShopTrangThaiHoatDong = "hoat_dong";
  let lyDo: string | null = null;

  if (overdue && overdueAllAnHan) {
    next = "han_che";
    lyDo = "Hạn chế — đang trong cửa sổ tự khai đã chuyển khoản.";
  } else if (overdue) {
    next = "khoa";
    lyDo = "Khóa do nợ phí nền tảng quá hạn.";
  } else if (donBase >= GATE_MIN_DON) {
    const tiLe = openKnHopLe / donBase;
    if (tiLe >= GATE_TI_LE_KHOA) {
      next = "khoa";
      lyDo = `Khóa do tỉ lệ tranh chấp cao (${Math.round(tiLe * 100)}%).`;
    } else if (tiLe >= GATE_TI_LE_HAN_CHE) {
      next = "han_che";
      lyDo = `Hạn chế do tỉ lệ tranh chấp (${Math.round(tiLe * 100)}%).`;
    } else if (openKnHopLe >= 1) {
      next = "canh_bao";
      lyDo = "Cảnh báo: có tranh chấp đang mở.";
    }
  } else if (openKnHopLe >= 1) {
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
    .select("trang_thai_hoat_dong, ly_do_khoa")
    .eq("id_nguoi_dung", sellerUserId)
    .eq("da_xoa", false)
    .maybeSingle<{
      trang_thai_hoat_dong: string | null;
      ly_do_khoa: string | null;
    }>();
  const st = data?.trang_thai_hoat_dong ?? "hoat_dong";
  if (st === "khoa" || isAdminManualLock(data?.ly_do_khoa)) {
    throw new Error("SHOP_KHOA");
  }
}
