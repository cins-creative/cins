import "server-only";

import type { QuanLyKhoItem } from "@/lib/cins/home-adaptive/quan-ly-kho-types";
import { QUAN_LY_KHO_SAP_HET } from "@/lib/cins/home-adaptive/quan-ly-kho-types";
import { shopImageUrl } from "@/lib/shop/settings";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { QuanLyKhoItem } from "@/lib/cins/home-adaptive/quan-ly-kho-types";
export { QUAN_LY_KHO_SAP_HET } from "@/lib/cins/home-adaptive/quan-ly-kho-types";

type SpRow = {
  id: string;
  ten: string | null;
  anh_id: string | null;
};

type BtRow = {
  id: string;
  id_san_pham: string;
  nhan: string | null;
  so_luong_ton: number | null;
  anh_id: string | null;
};

function mucDo(ton: number): QuanLyKhoItem["mucDo"] {
  if (ton <= 0) return "het";
  /* Sắp hết = còn dưới ngưỡng (1…N−1), không gồm đủ N. */
  if (ton < QUAN_LY_KHO_SAP_HET) return "sap_het";
  return "ok";
}

/**
 * Biến thể kho của seller — trả pool đủ để lọc Còn hàng / Sắp hết / Hết hàng.
 * Chỉ owner (`shop_san_pham.id_nguoi_dung`). `limit` = gợi ý kích thước pool.
 */
export async function loadQuanLyKho(
  ownerId: string,
  limit = 4,
): Promise<{ items: QuanLyKhoItem[]; canhBao: number }> {
  const admin = createServiceRoleClient();
  const poolCap = Math.min(120, Math.max(limit * 12, 48));
  try {
    const { data: sps, error: spErr } = await admin
      .from("shop_san_pham")
      .select("id, ten, anh_id")
      .eq("id_nguoi_dung", ownerId)
      .eq("da_xoa", false)
      .limit(200)
      .returns<SpRow[]>();

    if (spErr || !sps?.length) return { items: [], canhBao: 0 };

    const spById = new Map(sps.map((s) => [s.id, s]));
    const spIds = sps.map((s) => s.id);

    const { data: bts, error: btErr } = await admin
      .from("shop_bien_the")
      .select("id, id_san_pham, nhan, so_luong_ton, anh_id")
      .in("id_san_pham", spIds)
      .eq("da_xoa", false)
      .limit(Math.min(300, Math.max(poolCap, 120)))
      .returns<BtRow[]>();

    if (btErr || !bts?.length) return { items: [], canhBao: 0 };

    const mapped: QuanLyKhoItem[] = [];
    let canhBao = 0;
    for (const bt of bts) {
      const sp = spById.get(bt.id_san_pham);
      if (!sp) continue;
      const ton = Math.max(0, Math.trunc(Number(bt.so_luong_ton) || 0));
      const md = mucDo(ton);
      if (md !== "ok") canhBao += 1;
      mapped.push({
        bienTheId: bt.id,
        sanPhamId: sp.id,
        tenSanPham: sp.ten?.trim() || "Sản phẩm",
        nhan: bt.nhan?.trim() || "Mặc định",
        soLuongTon: ton,
        anhUrl: shopImageUrl(bt.anh_id ?? sp.anh_id),
        mucDo: md,
      });
    }

    mapped.sort(
      (a, b) =>
        a.soLuongTon - b.soLuongTon ||
        a.tenSanPham.localeCompare(b.tenSanPham, "vi"),
    );

    return {
      items: mapped,
      canhBao,
    };
  } catch {
    return { items: [], canhBao: 0 };
  }
}
