import "server-only";

import { assertShopNotTamDong } from "@/lib/shop/cua-hang";
import { listPostHang } from "@/lib/shop/post-hang";
import { listShopStorefrontItems } from "@/lib/shop/storefront";
import type { ShopGio, ShopGioDong, ShopStorefrontItem } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CuaHangScope = { id: string; sellerId: string };

async function resolveCuaHang(cuaHangId: string): Promise<CuaHangScope | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_cua_hang")
    .select("id, id_nguoi_dung")
    .eq("id", cuaHangId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();
  if (!data) return null;
  return { id: data.id, sellerId: data.id_nguoi_dung };
}

function emptyGio(opts: {
  cotMocId?: string | null;
  cuaHangId?: string | null;
  tienTe?: string;
}): ShopGio {
  return {
    id: null,
    idCotMoc: opts.cotMocId ?? null,
    idCuaHang: opts.cuaHangId ?? null,
    dong: [],
    tongTien: 0,
    tienTe: opts.tienTe ?? "VND",
  };
}

function dongFromStorefront(
  catalog: ShopStorefrontItem[],
  qtyByBt: Map<string, number>,
): { dong: ShopGioDong[]; tongTien: number; tienTe: string } {
  const outDong: ShopGioDong[] = [];
  let tong = 0;
  let tienTe = "VND";
  for (const item of catalog) {
    if (!item.idBienThe) continue;
    const soLuong = qtyByBt.get(item.idBienThe);
    if (soLuong === undefined) continue;
    if (item.giaHienThi == null) continue;
    tienTe = item.tienTe;
    tong += item.giaHienThi * soLuong;
    outDong.push({
      idBienThe: item.idBienThe,
      soLuong,
      tenSanPham: item.tenSanPham,
      nhanBienThe: item.nhanBienThe ?? "Mặc định",
      giaHienThi: item.giaHienThi,
      tienTe: item.tienTe,
      anhUrl: item.anhUrl,
      soLuongTon: item.soLuongTon,
    });
  }
  return { dong: outDong, tongTien: tong, tienTe };
}

async function loadQtyByBt(
  gioId: string,
): Promise<Map<string, number>> {
  const admin = createServiceRoleClient();
  const { data: dongs } = await admin
    .from("shop_gio_dong")
    .select("id_bien_the, so_luong")
    .eq("id_gio", gioId);
  return new Map(
    ((dongs ?? []) as Array<{ id_bien_the: string; so_luong: number }>).map(
      (d) => [d.id_bien_the, d.so_luong],
    ),
  );
}

export async function getGio(
  buyerId: string,
  cotMocId: string,
): Promise<ShopGio> {
  const admin = createServiceRoleClient();
  const hang = await listPostHang(cotMocId);

  const { data: gio } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_cot_moc", cotMocId)
    .maybeSingle<{ id: string }>();

  if (!gio) {
    return emptyGio({ cotMocId, tienTe: hang[0]?.tienTe ?? "VND" });
  }

  const qtyByBt = await loadQtyByBt(gio.id);
  const outDong: ShopGioDong[] = [];
  let tong = 0;
  let tienTe = hang[0]?.tienTe ?? "VND";

  for (const h of hang) {
    const soLuong = qtyByBt.get(h.idBienThe);
    if (soLuong === undefined) continue;
    tienTe = h.tienTe;
    tong += h.giaHienThi * soLuong;
    outDong.push({
      idBienThe: h.idBienThe,
      soLuong,
      tenSanPham: h.tenSanPham,
      nhanBienThe: h.nhanBienThe,
      giaHienThi: h.giaHienThi,
      tienTe: h.tienTe,
      anhUrl: h.anhUrl,
      soLuongTon: h.soLuongTon,
    });
  }

  return {
    id: gio.id,
    idCotMoc: cotMocId,
    idCuaHang: null,
    dong: outDong,
    tongTien: tong,
    tienTe,
  };
}

export async function getGioCuaHang(
  buyerId: string,
  cuaHangId: string,
): Promise<ShopGio> {
  const scope = await resolveCuaHang(cuaHangId);
  if (!scope) throw new Error("SHOP_NOT_FOUND");

  const catalog = await listShopStorefrontItems({
    sellerId: scope.sellerId,
    ownerSlug: "",
    asOwner: false,
  });

  const admin = createServiceRoleClient();
  const { data: gio } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_cua_hang", cuaHangId)
    .maybeSingle<{ id: string }>();

  if (!gio) {
    return emptyGio({
      cuaHangId,
      tienTe: catalog[0]?.tienTe ?? "VND",
    });
  }

  const qtyByBt = await loadQtyByBt(gio.id);
  const { dong, tongTien, tienTe } = dongFromStorefront(catalog, qtyByBt);

  return {
    id: gio.id,
    idCotMoc: null,
    idCuaHang: cuaHangId,
    dong,
    tongTien,
    tienTe,
  };
}

/** Đặt số lượng 1 biến thể trong giỏ post (0 = xóa dòng). */
export async function setGioDong(
  buyerId: string,
  cotMocId: string,
  idBienThe: string,
  soLuong: number,
): Promise<ShopGio> {
  const qty = Math.trunc(soLuong);
  if (qty < 0) throw new Error("INVALID_QTY");

  const hang = await listPostHang(cotMocId);
  const item = hang.find((h) => h.idBienThe === idBienThe);
  if (!item) throw new Error("ITEM_NOT_ON_POST");

  const admin = createServiceRoleClient();
  let { data: gio } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_cot_moc", cotMocId)
    .maybeSingle<{ id: string }>();

  if (!gio) {
    if (qty === 0) {
      return getGio(buyerId, cotMocId);
    }
    const { data: created, error } = await admin
      .from("shop_gio")
      .insert({ id_nguoi_mua: buyerId, id_cot_moc: cotMocId })
      .select("id")
      .single<{ id: string }>();
    if (error || !created) throw new Error("CART_FAILED");
    gio = created;
  }

  await upsertGioDong(gio.id, idBienThe, qty);
  return getGio(buyerId, cotMocId);
}

/** Đặt số lượng trong giỏ cửa hàng (catalog đang bán — không cần gắn bài). */
export async function setGioDongCuaHang(
  buyerId: string,
  cuaHangId: string,
  idBienThe: string,
  soLuong: number,
): Promise<ShopGio> {
  const qty = Math.trunc(soLuong);
  if (qty < 0) throw new Error("INVALID_QTY");

  const scope = await resolveCuaHang(cuaHangId);
  if (!scope) throw new Error("SHOP_NOT_FOUND");
  if (scope.sellerId === buyerId) throw new Error("CANNOT_BUY_OWN");
  if (qty > 0) await assertShopNotTamDong(scope.sellerId);

  const catalog = await listShopStorefrontItems({
    sellerId: scope.sellerId,
    ownerSlug: "",
    asOwner: false,
  });
  const item = catalog.find((h) => h.idBienThe === idBienThe);
  if (!item || item.giaHienThi == null) throw new Error("ITEM_NOT_IN_SHOP");
  if (item.hetHang && qty > 0) throw new Error("STOCK_EMPTY");
  if (qty > item.soLuongTon) throw new Error("STOCK_INSUFFICIENT");

  const admin = createServiceRoleClient();
  let { data: gio } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_cua_hang", cuaHangId)
    .maybeSingle<{ id: string }>();

  if (!gio) {
    if (qty === 0) {
      return getGioCuaHang(buyerId, cuaHangId);
    }
    const { data: created, error } = await admin
      .from("shop_gio")
      .insert({ id_nguoi_mua: buyerId, id_cua_hang: cuaHangId })
      .select("id")
      .single<{ id: string }>();
    if (error || !created) throw new Error("CART_FAILED");
    gio = created;
  }

  await upsertGioDong(gio.id, idBienThe, qty);
  return getGioCuaHang(buyerId, cuaHangId);
}

async function upsertGioDong(
  gioId: string,
  idBienThe: string,
  qty: number,
): Promise<void> {
  const admin = createServiceRoleClient();
  if (qty === 0) {
    await admin
      .from("shop_gio_dong")
      .delete()
      .eq("id_gio", gioId)
      .eq("id_bien_the", idBienThe);
  } else {
    const { data: existing } = await admin
      .from("shop_gio_dong")
      .select("id")
      .eq("id_gio", gioId)
      .eq("id_bien_the", idBienThe)
      .maybeSingle();
    if (existing) {
      await admin
        .from("shop_gio_dong")
        .update({ so_luong: qty })
        .eq("id", existing.id);
    } else {
      await admin.from("shop_gio_dong").insert({
        id_gio: gioId,
        id_bien_the: idBienThe,
        so_luong: qty,
      });
    }
  }

  await admin
    .from("shop_gio")
    .update({ cap_nhat_luc: new Date().toISOString() })
    .eq("id", gioId);
}

/** Xóa toàn bộ dòng giỏ của buyer trên 1 cột mốc. */
export async function clearGio(
  buyerId: string,
  cotMocId: string,
): Promise<ShopGio> {
  const admin = createServiceRoleClient();
  const { data: gio } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_cot_moc", cotMocId)
    .maybeSingle<{ id: string }>();

  if (gio) {
    await admin.from("shop_gio_dong").delete().eq("id_gio", gio.id);
    await admin
      .from("shop_gio")
      .update({ cap_nhat_luc: new Date().toISOString() })
      .eq("id", gio.id);
  }

  return getGio(buyerId, cotMocId);
}

export async function clearGioCuaHang(
  buyerId: string,
  cuaHangId: string,
): Promise<ShopGio> {
  const admin = createServiceRoleClient();
  const { data: gio } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_cua_hang", cuaHangId)
    .maybeSingle<{ id: string }>();

  if (gio) {
    await admin.from("shop_gio_dong").delete().eq("id_gio", gio.id);
    await admin
      .from("shop_gio")
      .update({ cap_nhat_luc: new Date().toISOString() })
      .eq("id", gio.id);
  }

  return getGioCuaHang(buyerId, cuaHangId);
}
