import "server-only";

import type { GioHangHomeItem } from "@/lib/cins/home-adaptive/gio-hang-types";
import { getGioChung } from "@/lib/shop/gio-chung";

export type { GioHangHomeItem } from "@/lib/cins/home-adaptive/gio-hang-types";
export { formatGioHangGia } from "@/lib/cins/home-adaptive/gio-hang-types";

/**
 * Dòng giỏ chờ mua của viewer — module `gio_hang_cua_ban`.
 * Nguồn: `getGioChung` (shop_gio chung, không gắn sự kiện).
 */
export async function loadGioHangCuaBan(
  viewerId: string,
  limit = 4,
): Promise<{ items: GioHangHomeItem[]; tongSoDong: number }> {
  try {
    const gio = await getGioChung(viewerId);
    const flat: GioHangHomeItem[] = [];
    for (const nhom of gio.nhom) {
      for (const d of nhom.dong) {
        flat.push({
          idBienThe: d.idBienThe,
          tenSanPham: d.tenSanPham,
          nhanBienThe: d.nhanBienThe,
          soLuong: d.soLuong,
          giaHienThi: Number.isFinite(d.giaHienThi) ? d.giaHienThi : null,
          anhUrl: d.anhUrl,
          tenCuaHang: nhom.tenCuaHang,
        });
      }
    }
    return {
      items: flat.slice(0, Math.max(1, Math.round(limit))),
      tongSoDong: gio.tongSoDong,
    };
  } catch {
    return { items: [], tongSoDong: 0 };
  }
}
