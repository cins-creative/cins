import "server-only";

import { resolveGiaBienThe } from "@/lib/shop/bang-gia";
import { assertShopReady } from "@/lib/shop/cua-hang";
import { shopImageUrl } from "@/lib/shop/settings";
import type { ShopPostHangItem } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type PostHangRow = {
  id: string;
  id_cot_moc: string;
  id_bien_the: string;
  id_bang_gia: string | null;
  gia_hien_thi: number | string;
  tien_te: string;
  thu_tu: number;
};

export async function listPostHang(
  cotMocId: string,
): Promise<ShopPostHangItem[]> {
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("shop_post_hang")
    .select("id, id_cot_moc, id_bien_the, id_bang_gia, gia_hien_thi, tien_te, thu_tu")
    .eq("id_cot_moc", cotMocId)
    .order("thu_tu", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[shop] listPostHang", error);
    return [];
  }
  const list = (rows ?? []) as PostHangRow[];
  if (list.length === 0) return [];

  const btIds = list.map((r) => r.id_bien_the);
  const { data: bts } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham, nhan, so_luong_ton, anh_id, da_xoa")
    .in("id", btIds);
  const btMap = new Map(
    ((bts ?? []) as Array<{
      id: string;
      id_san_pham: string;
      nhan: string;
      so_luong_ton: number;
      anh_id: string | null;
      da_xoa: boolean;
    }>).map((b) => [b.id, b]),
  );

  const spIds = [
    ...new Set(
      [...btMap.values()].map((b) => b.id_san_pham).filter(Boolean),
    ),
  ];
  const { data: sps } = await admin
    .from("shop_san_pham")
    .select("id, ten, anh_id, phan_loai, phan_loai_2, da_xoa, dang_ban")
    .in("id", spIds);
  const spMap = new Map(
    ((sps ?? []) as Array<{
      id: string;
      ten: string;
      anh_id: string | null;
      phan_loai: string | null;
      phan_loai_2: string | null;
      da_xoa: boolean;
      dang_ban: boolean;
    }>).map((s) => [s.id, s]),
  );

  /* Tổng SL đã bán theo biến thể — đơn đã trừ kho (mua_ngay). */
  const soldByBienThe = new Map<string, number>();
  {
    const { data: dongBan, error: soldErr } = await admin
      .from("shop_don_hang_dong")
      .select("id_bien_the, so_luong, shop_don_hang!inner(trang_thai)")
      .in("id_bien_the", btIds);
    if (soldErr) {
      console.error("[shop] listPostHang sold", soldErr);
    } else {
      for (const row of (dongBan ?? []) as Array<{
        id_bien_the: string | null;
        so_luong: number;
        shop_don_hang:
          | { trang_thai: string }
          | { trang_thai: string }[]
          | null;
      }>) {
        if (!row.id_bien_the) continue;
        const don = Array.isArray(row.shop_don_hang)
          ? row.shop_don_hang[0]
          : row.shop_don_hang;
        if (!don) continue;
        if (
          don.trang_thai !== "cho_xac_nhan" &&
          don.trang_thai !== "da_nhan_tien" &&
          don.trang_thai !== "da_giao_tai_su_kien"
        ) {
          continue;
        }
        const qty = Math.max(0, Math.trunc(Number(row.so_luong) || 0));
        soldByBienThe.set(
          row.id_bien_the,
          (soldByBienThe.get(row.id_bien_the) ?? 0) + qty,
        );
      }
    }
  }

  const out: ShopPostHangItem[] = [];
  for (const row of list) {
    const bt = btMap.get(row.id_bien_the);
    if (!bt || bt.da_xoa) continue;
    const sp = spMap.get(bt.id_san_pham);
    if (!sp || sp.da_xoa || !sp.dang_ban) continue;
    const ton = bt.so_luong_ton;
    out.push({
      id: row.id,
      idBienThe: bt.id,
      idSanPham: sp.id,
      tenSanPham: sp.ten,
      nhanBienThe: bt.nhan,
      phanLoai: sp.phan_loai?.trim() || null,
      phanLoai2: sp.phan_loai_2?.trim() || null,
      anhUrl: shopImageUrl(bt.anh_id ?? sp.anh_id),
      soLuongTon: ton,
      soLuongBan: soldByBienThe.get(bt.id) ?? 0,
      giaHienThi: Number(row.gia_hien_thi),
      tienTe: row.tien_te,
      idBangGia: row.id_bang_gia,
      thuTu: row.thu_tu,
      hetHang: ton <= 0,
    });
  }
  return out;
}

export async function setPostHang(
  ownerId: string,
  cotMocId: string,
  items: Array<{
    idBienThe: string;
    idBangGia: string;
    thuTu?: number;
  }>,
): Promise<ShopPostHangItem[]> {
  await assertShopReady(ownerId);
  const admin = createServiceRoleClient();

  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();
  if (!moc || moc.id_nguoi_dung !== ownerId) throw new Error("FORBIDDEN");

  await admin.from("shop_post_hang").delete().eq("id_cot_moc", cotMocId);

  if (items.length === 0) return [];

  const inserts: Array<{
    id_cot_moc: string;
    id_bien_the: string;
    id_bang_gia: string;
    gia_hien_thi: number;
    tien_te: string;
    thu_tu: number;
  }> = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const resolved = await resolveGiaBienThe(it.idBangGia, it.idBienThe);
    if (!resolved) throw new Error("GIA_NOT_FOUND");
    inserts.push({
      id_cot_moc: cotMocId,
      id_bien_the: it.idBienThe,
      id_bang_gia: it.idBangGia,
      gia_hien_thi: resolved.gia,
      tien_te: resolved.tienTe,
      thu_tu: it.thuTu ?? i,
    });
  }

  const { error } = await admin.from("shop_post_hang").insert(inserts);
  if (error) {
    console.error("[shop] setPostHang", error);
    throw new Error("SAVE_FAILED");
  }
  return listPostHang(cotMocId);
}
