import "server-only";

import { listPostHang } from "@/lib/shop/post-hang";
import type { ShopGio, ShopGioDong } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function getGio(
  buyerId: string,
  cotMocId: string,
): Promise<ShopGio> {
  const admin = createServiceRoleClient();
  const hang = await listPostHang(cotMocId);
  const hangByBt = new Map(hang.map((h) => [h.idBienThe, h]));

  const { data: gio } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_cot_moc", cotMocId)
    .maybeSingle<{ id: string }>();

  if (!gio) {
    return {
      id: null,
      idCotMoc: cotMocId,
      dong: [],
      tongTien: 0,
      tienTe: hang[0]?.tienTe ?? "VND",
    };
  }

  const { data: dongs } = await admin
    .from("shop_gio_dong")
    .select("id_bien_the, so_luong")
    .eq("id_gio", gio.id);

  const outDong: ShopGioDong[] = [];
  let tong = 0;
  let tienTe = hang[0]?.tienTe ?? "VND";

  for (const d of (dongs ?? []) as Array<{
    id_bien_the: string;
    so_luong: number;
  }>) {
    const h = hangByBt.get(d.id_bien_the);
    if (!h) continue;
    tienTe = h.tienTe;
    tong += h.giaHienThi * d.so_luong;
    outDong.push({
      idBienThe: d.id_bien_the,
      soLuong: d.so_luong,
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
    dong: outDong,
    tongTien: tong,
    tienTe,
  };
}

/** Đặt số lượng 1 biến thể trong giỏ (0 = xóa dòng). */
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

  if (qty === 0) {
    await admin
      .from("shop_gio_dong")
      .delete()
      .eq("id_gio", gio.id)
      .eq("id_bien_the", idBienThe);
  } else {
    const { data: existing } = await admin
      .from("shop_gio_dong")
      .select("id")
      .eq("id_gio", gio.id)
      .eq("id_bien_the", idBienThe)
      .maybeSingle();
    if (existing) {
      await admin
        .from("shop_gio_dong")
        .update({ so_luong: qty })
        .eq("id", existing.id);
    } else {
      await admin.from("shop_gio_dong").insert({
        id_gio: gio.id,
        id_bien_the: idBienThe,
        so_luong: qty,
      });
    }
  }

  await admin
    .from("shop_gio")
    .update({ cap_nhat_luc: new Date().toISOString() })
    .eq("id", gio.id);

  return getGio(buyerId, cotMocId);
}
