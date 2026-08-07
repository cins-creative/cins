import "server-only";

import {
  anHanConHieuLuc,
  getSoNgayAnHanTuKhai,
} from "@/lib/billing/an-han";
import { conNoHoaDon } from "@/lib/billing/hoa-don-ma";
import { mapHoaDonDb } from "@/lib/billing/hoa-don";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ShopPhiGateTrangThai =
  | "hoat_dong"
  | "canh_bao"
  | "khoa_nhan_don";

export type ShopPhiGate = {
  trangThai: ShopPhiGateTrangThai;
  tongNoVnd: number;
  hanTraGanNhat: string | null;
  /** P0: đang trong cửa sổ tự khai đã chuyển */
  tuKhaiTamMo: boolean;
  /** `cins_dich_vu.id` — deep-link hub ?dv= */
  dichVuId: string | null;
};

const HD_SELECT =
  "id, id_tk, id_dich_vu, tu_ngay, den_ngay, ngay_chot, thong_bao_luc, han_tra, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu, tu_khai_da_tra_luc, tu_khai_lan, tu_khai_boi, nguon_bang, nguon_id, hoa_don_thong_tin";

/**
 * Gate phí nền tảng shop — banner / cảnh báo trên /ban-hang.
 * Ưu tiên `cins_hoa_don`; fallback `shop_phi_ky` nếu chưa dual-write.
 */
export async function getShopPhiGate(sellerId: string): Promise<ShopPhiGate> {
  const admin = createServiceRoleClient();
  const now = new Date();
  const soNgay = await getSoNgayAnHanTuKhai();

  const { data: dv } = await admin
    .from("cins_dich_vu")
    .select("id")
    .eq("loai", "shop_phi")
    .eq("tham_chieu_id", sellerId)
    .maybeSingle<{ id: string }>();

  if (dv?.id) {
    const { data: hdRows } = await admin
      .from("cins_hoa_don")
      .select(HD_SELECT)
      .eq("id_dich_vu", dv.id)
      .in("trang_thai", ["chua_tra", "qua_han"])
      .order("han_tra", { ascending: true });

    const rows = ((hdRows ?? []) as Parameters<typeof mapHoaDonDb>[0][]).map(
      mapHoaDonDb,
    );
    let tongNo = 0;
    for (const h of rows) {
      tongNo += conNoHoaDon(h);
    }

    const quaHan = rows.filter((h) => h.trangThai === "qua_han");
    const chuaTra = rows.filter((h) => h.trangThai === "chua_tra");
    const noGanNhat = rows[0] ?? null;

    let tuKhaiTamMo = false;
    for (const h of quaHan) {
      if (anHanConHieuLuc({ tuKhaiDaTraLuc: h.tuKhaiDaTraLuc }, soNgay, now)) {
        tuKhaiTamMo = true;
        break;
      }
    }

    let trangThai: ShopPhiGateTrangThai = "hoat_dong";
    if (quaHan.length > 0) {
      trangThai = tuKhaiTamMo ? "canh_bao" : "khoa_nhan_don";
    } else if (chuaTra.length > 0) {
      trangThai = "canh_bao";
    }

    return {
      trangThai,
      tongNoVnd: tongNo,
      hanTraGanNhat: noGanNhat?.hanTra ?? null,
      tuKhaiTamMo,
      dichVuId: dv.id,
    };
  }

  /* Fallback legacy kỳ shop */
  const { data: kys } = await admin
    .from("shop_phi_ky")
    .select("phi_phai_tra, trang_thai, han_tra")
    .eq("id_nguoi_ban", sellerId)
    .in("trang_thai", ["chua_tra", "qua_han"])
    .order("han_tra", { ascending: true });

  const legacy = (kys ?? []) as Array<{
    phi_phai_tra: number | string;
    trang_thai: string;
    han_tra: string | null;
  }>;

  if (legacy.length === 0) {
    return {
      trangThai: "hoat_dong",
      tongNoVnd: 0,
      hanTraGanNhat: null,
      tuKhaiTamMo: false,
      dichVuId: null,
    };
  }

  let tongNo = 0;
  for (const k of legacy) {
    tongNo += Math.max(0, Math.round(Number(k.phi_phai_tra) || 0));
  }
  const quaHan = legacy.filter((k) => k.trang_thai === "qua_han");
  const chuaTra = legacy.filter((k) => k.trang_thai === "chua_tra");

  let trangThai: ShopPhiGateTrangThai = "hoat_dong";
  if (quaHan.length > 0) {
    trangThai = "khoa_nhan_don";
  } else if (chuaTra.length > 0) {
    trangThai = "canh_bao";
  }

  return {
    trangThai,
    tongNoVnd: tongNo,
    hanTraGanNhat: legacy[0]?.han_tra ?? null,
    tuKhaiTamMo: false,
    dichVuId: null,
  };
}
