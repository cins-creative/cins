import "server-only";

import { kAnonCount } from "@/lib/social/su-kien-constants";
import { getShopCuaHangByUserId } from "@/lib/shop/cua-hang";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ShopTiepCanLoai = {
  idNhom: string;
  nhan: string;
  luotThay: number;
  nguoiThay: number;
  luotMo: number;
  luotThemGio: number;
};

export type ShopTiepCanSanPham = {
  idSanPham: string;
  ten: string;
  luotThay: number;
  nguoiThay: number;
  luotMo: number;
  luotThemGio: number;
};

type RollupRow = {
  id_san_pham: string;
  luot_thay: number | null;
  nguoi_thay: number | null;
  luot_mo: number | null;
  luot_them_gio: number | null;
};

type Agg = {
  luotThay: number;
  nguoiThay: number;
  luotMo: number;
  luotThemGio: number;
};

function emptyAgg(): Agg {
  return { luotThay: 0, nguoiThay: 0, luotMo: 0, luotThemGio: 0 };
}

function addAgg(into: Agg, row: RollupRow): void {
  into.luotThay += Number(row.luot_thay) || 0;
  into.nguoiThay += Number(row.nguoi_thay) || 0;
  into.luotMo += Number(row.luot_mo) || 0;
  into.luotThemGio += Number(row.luot_them_gio) || 0;
}

function ngayUtcOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadRollupRows(cuaHangId: string): Promise<RollupRow[]> {
  const admin = createServiceRoleClient();
  const fromNgay = ngayUtcOffset(-90);
  const out: RollupRow[] = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("shop_thong_ke_san_pham_ngay")
      .select("id_san_pham, luot_thay, nguoi_thay, luot_mo, luot_them_gio")
      .eq("id_cua_hang", cuaHangId)
      .gte("ngay", fromNgay)
      .range(from, from + page - 1)
      .returns<RollupRow[]>();
    if (error) {
      console.error("[shop] tiep-can rollup", error);
      break;
    }
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < page) break;
    from += page;
  }
  return out;
}

async function loadSanPhamMeta(
  sellerId: string,
  ids: string[],
): Promise<Map<string, { ten: string; idNhom: string | null }>> {
  const map = new Map<string, { ten: string; idNhom: string | null }>();
  if (ids.length === 0) return map;
  const admin = createServiceRoleClient();
  const chunk = 200;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { data } = await admin
      .from("shop_san_pham")
      .select("id, ten, id_nhom")
      .eq("id_nguoi_dung", sellerId)
      .eq("da_xoa", false)
      .in("id", slice)
      .returns<Array<{ id: string; ten: string | null; id_nhom: string | null }>>();
    for (const r of data ?? []) {
      map.set(r.id, { ten: r.ten?.trim() || "Mẫu", idNhom: r.id_nhom });
    }
  }
  return map;
}

/**
 * Gom tiếp cận theo loại hàng trục 1 (`shop_san_pham.id_nhom`).
 * `nguoiThay` là tổng theo mẫu/ngày — có thể trùng thiết bị giữa các mẫu cùng loại.
 */
export async function getTiepCanTheoLoai(
  sellerId: string,
): Promise<ShopTiepCanLoai[]> {
  const shop = await getShopCuaHangByUserId(sellerId);
  if (!shop) return [];

  const rows = await loadRollupRows(shop.id);
  if (rows.length === 0) return [];

  const bySp = new Map<string, Agg>();
  for (const row of rows) {
    const cur = bySp.get(row.id_san_pham) ?? emptyAgg();
    addAgg(cur, row);
    bySp.set(row.id_san_pham, cur);
  }

  const meta = await loadSanPhamMeta(sellerId, [...bySp.keys()]);
  const byNhom = new Map<string, Agg>();
  for (const [spId, agg] of bySp) {
    const idNhom = meta.get(spId)?.idNhom;
    if (!idNhom) continue;
    const cur = byNhom.get(idNhom) ?? emptyAgg();
    cur.luotThay += agg.luotThay;
    cur.nguoiThay += agg.nguoiThay;
    cur.luotMo += agg.luotMo;
    cur.luotThemGio += agg.luotThemGio;
    byNhom.set(idNhom, cur);
  }
  if (byNhom.size === 0) return [];

  const admin = createServiceRoleClient();
  const nhomIds = [...byNhom.keys()];
  const { data: nhoms } = await admin
    .from("shop_nhom")
    .select("id, nhan")
    .eq("id_nguoi_dung", sellerId)
    .eq("truc", 1)
    .in("id", nhomIds)
    .returns<Array<{ id: string; nhan: string | null }>>();
  const nhanById = new Map(
    (nhoms ?? []).map((n) => [n.id, n.nhan?.trim() || "Loại"]),
  );

  const out: ShopTiepCanLoai[] = [];
  for (const [idNhom, agg] of byNhom) {
    const nhan = nhanById.get(idNhom);
    if (!nhan) continue;
    out.push({
      idNhom,
      nhan,
      luotThay: agg.luotThay,
      nguoiThay: kAnonCount(agg.nguoiThay),
      luotMo: agg.luotMo,
      luotThemGio: agg.luotThemGio,
    });
  }
  return out.sort((a, b) => b.luotThay - a.luotThay);
}

export async function getTiepCanTheoSanPham(
  sellerId: string,
  limit = 8,
): Promise<ShopTiepCanSanPham[]> {
  const shop = await getShopCuaHangByUserId(sellerId);
  if (!shop) return [];

  const rows = await loadRollupRows(shop.id);
  if (rows.length === 0) return [];

  const bySp = new Map<string, Agg>();
  for (const row of rows) {
    const cur = bySp.get(row.id_san_pham) ?? emptyAgg();
    addAgg(cur, row);
    bySp.set(row.id_san_pham, cur);
  }
  const ranked = [...bySp.entries()]
    .sort((a, b) => b[1].luotThay - a[1].luotThay)
    .slice(0, Math.max(1, limit));
  const meta = await loadSanPhamMeta(
    sellerId,
    ranked.map(([id]) => id),
  );

  return ranked.map(([idSanPham, agg]) => ({
    idSanPham,
    ten: meta.get(idSanPham)?.ten ?? "Mẫu",
    luotThay: agg.luotThay,
    nguoiThay: kAnonCount(agg.nguoiThay),
    luotMo: agg.luotMo,
    luotThemGio: agg.luotThemGio,
  }));
}
