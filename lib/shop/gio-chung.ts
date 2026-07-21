import "server-only";

import {
  assertShopNotTamDong,
} from "@/lib/shop/cua-hang";
import { shopImageUrl } from "@/lib/shop/settings";
import type {
  ShopGioChung,
  ShopGioChungDong,
  ShopGioChungNhom,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Giỏ chung ("giỏ chờ mua"): một giỏ / buyer, gom hàng của nhiều cửa hàng.
 * Không gắn sự kiện, không gắn bài. Scope trong `shop_gio`: id_cot_moc NULL
 * và id_cua_hang NULL. Giá lấy theo **giá đang bán** (ưu tiên giá giảm) từ
 * bảng giá mới nhất còn dòng — không snapshot lúc thêm. Checkout tách theo
 * seller (mỗi seller = một `shop_don_hang`).
 */

type BienTheInfo = {
  idBienThe: string;
  idSanPham: string;
  idNguoiBan: string;
  tenSanPham: string;
  nhanBienThe: string;
  anhUrl: string | null;
  soLuongTon: number;
  /** Giá khách trả (ưu tiên giảm). Null = chưa có dòng giá. */
  giaHienThi: number | null;
  tienTe: string;
  /** Ngừng bán / xóa / hết dòng giá → không cho gửi đơn. */
  ngungBan: boolean;
};

/** Resolve thông tin + giá đang bán cho một tập biến thể. */
async function resolveBienThe(
  btIds: string[],
): Promise<Map<string, BienTheInfo>> {
  const out = new Map<string, BienTheInfo>();
  if (btIds.length === 0) return out;

  const admin = createServiceRoleClient();

  const { data: btRows } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham, nhan, so_luong_ton, anh_id, da_xoa")
    .in("id", btIds);
  const bts = (btRows ?? []) as Array<{
    id: string;
    id_san_pham: string;
    nhan: string | null;
    so_luong_ton: number;
    anh_id: string | null;
    da_xoa: boolean;
  }>;
  if (bts.length === 0) return out;

  const spIds = [...new Set(bts.map((b) => b.id_san_pham))];
  const { data: spRows } = await admin
    .from("shop_san_pham")
    .select("id, id_nguoi_dung, ten, anh_id, dang_ban, da_xoa")
    .in("id", spIds);
  const spById = new Map(
    ((spRows ?? []) as Array<{
      id: string;
      id_nguoi_dung: string;
      ten: string;
      anh_id: string | null;
      dang_ban: boolean;
      da_xoa: boolean;
    }>).map((s) => [s.id, s]),
  );

  const sellerIds = [
    ...new Set(
      [...spById.values()].map((s) => s.id_nguoi_dung).filter(Boolean),
    ),
  ];

  /* Giá: bảng giá mới nhất (theo seller) còn dòng cho biến thể thắng. */
  const giaByBt = new Map<
    string,
    { giaHieuLuc: number; tienTe: string; rank: number }
  >();
  if (sellerIds.length > 0) {
    const { data: bgRows } = await admin
      .from("shop_bang_gia")
      .select("id, tien_te, tao_luc")
      .in("id_nguoi_dung", sellerIds)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false })
      .limit(200);
    const bangGias = (bgRows ?? []) as Array<{
      id: string;
      tien_te: string | null;
      tao_luc: string;
    }>;
    if (bangGias.length > 0) {
      const bgIds = bangGias.map((b) => b.id);
      const bgRank = new Map(bangGias.map((b, i) => [b.id, i]));
      const bgTienTe = new Map(bangGias.map((b) => [b.id, b.tien_te || "VND"]));
      const { data: dongRows } = await admin
        .from("shop_bang_gia_dong")
        .select("id_bang_gia, id_bien_the, gia, gia_giam")
        .in("id_bang_gia", bgIds)
        .in("id_bien_the", btIds);
      for (const d of (dongRows ?? []) as Array<{
        id_bang_gia: string;
        id_bien_the: string;
        gia: number | string;
        gia_giam: number | string | null;
      }>) {
        const rank = bgRank.get(d.id_bang_gia);
        if (rank == null) continue;
        const prev = giaByBt.get(d.id_bien_the);
        if (prev && prev.rank <= rank) continue;
        const giaBan = Number(d.gia);
        const giaGiam = d.gia_giam == null ? null : Number(d.gia_giam);
        giaByBt.set(d.id_bien_the, {
          giaHieuLuc: giaGiam != null ? giaGiam : giaBan,
          tienTe: bgTienTe.get(d.id_bang_gia) || "VND",
          rank,
        });
      }
    }
  }

  for (const bt of bts) {
    const sp = spById.get(bt.id_san_pham);
    if (!sp) continue;
    const gia = giaByBt.get(bt.id) ?? null;
    const ngungBan =
      sp.da_xoa || !sp.dang_ban || bt.da_xoa || gia == null;
    out.set(bt.id, {
      idBienThe: bt.id,
      idSanPham: sp.id,
      idNguoiBan: sp.id_nguoi_dung,
      tenSanPham: sp.ten,
      nhanBienThe: bt.nhan?.trim() || "Mặc định",
      anhUrl: shopImageUrl(bt.anh_id ?? sp.anh_id),
      soLuongTon: bt.so_luong_ton,
      giaHienThi: gia?.giaHieuLuc ?? null,
      tienTe: gia?.tienTe ?? "VND",
      ngungBan,
    });
  }
  return out;
}

/** Nhãn cửa hàng + slug + có thể nhận tiền, batched theo seller. */
async function resolveNguoiBan(
  sellerIds: string[],
): Promise<
  Map<
    string,
    {
      idCuaHang: string | null;
      tenCuaHang: string;
      sellerSlug: string | null;
      avatarUrl: string | null;
      coThanhToan: boolean;
    }
  >
> {
  const out = new Map<
    string,
    {
      idCuaHang: string | null;
      tenCuaHang: string;
      sellerSlug: string | null;
      avatarUrl: string | null;
      coThanhToan: boolean;
    }
  >();
  if (sellerIds.length === 0) return out;

  const admin = createServiceRoleClient();

  const { data: userRows } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, ban_hang_bat")
    .in("id", sellerIds);
  const userById = new Map(
    ((userRows ?? []) as Array<{
      id: string;
      slug: string | null;
      ten_hien_thi: string | null;
      ban_hang_bat: boolean;
    }>).map((u) => [u.id, u]),
  );

  const { data: shopRows } = await admin
    .from("shop_cua_hang")
    .select("id, id_nguoi_dung, ten, avatar_id")
    .in("id_nguoi_dung", sellerIds)
    .eq("da_xoa", false);
  const shopBySeller = new Map(
    ((shopRows ?? []) as Array<{
      id: string;
      id_nguoi_dung: string;
      ten: string | null;
      avatar_id: string | null;
    }>).map((s) => [s.id_nguoi_dung, s]),
  );

  const cuaHangIds = [...shopBySeller.values()].map((s) => s.id);
  const cuaHangCoTt = new Set<string>();
  if (cuaHangIds.length > 0) {
    const { data: ptttRows } = await admin
      .from("shop_phuong_thuc_tt")
      .select("id_cua_hang")
      .in("id_cua_hang", cuaHangIds)
      .eq("kich_hoat", true);
    for (const p of (ptttRows ?? []) as Array<{ id_cua_hang: string }>) {
      cuaHangCoTt.add(p.id_cua_hang);
    }
  }

  for (const sellerId of sellerIds) {
    const user = userById.get(sellerId);
    const shop = shopBySeller.get(sellerId);
    const tenCuaHang =
      shop?.ten?.trim() || user?.ten_hien_thi?.trim() || "Cửa hàng";
    const coThanhToan =
      Boolean(user?.ban_hang_bat) &&
      Boolean(shop && cuaHangCoTt.has(shop.id));
    out.set(sellerId, {
      idCuaHang: shop?.id ?? null,
      tenCuaHang,
      sellerSlug: user?.slug?.trim() || null,
      avatarUrl: shopImageUrl(shop?.avatar_id ?? null),
      coThanhToan,
    });
  }
  return out;
}

async function findGioChungId(buyerId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_gio")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .is("id_cot_moc", null)
    .is("id_cua_hang", null)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

function emptyGioChung(id: string | null): ShopGioChung {
  return { id, nhom: [], tongSoDong: 0 };
}

export async function getGioChung(buyerId: string): Promise<ShopGioChung> {
  const gioId = await findGioChungId(buyerId);
  if (!gioId) return emptyGioChung(null);

  const admin = createServiceRoleClient();
  const { data: dongRows } = await admin
    .from("shop_gio_dong")
    .select("id_bien_the, so_luong")
    .eq("id_gio", gioId);
  const dongs = (dongRows ?? []) as Array<{
    id_bien_the: string;
    so_luong: number;
  }>;
  if (dongs.length === 0) return emptyGioChung(gioId);

  const btInfo = await resolveBienThe(dongs.map((d) => d.id_bien_the));
  const sellerIds = [
    ...new Set(
      dongs
        .map((d) => btInfo.get(d.id_bien_the)?.idNguoiBan)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const banInfo = await resolveNguoiBan(sellerIds);

  const nhomBySeller = new Map<string, ShopGioChungNhom>();
  let tongSoDong = 0;

  for (const d of dongs) {
    const info = btInfo.get(d.id_bien_the);
    if (!info) continue;
    tongSoDong += 1;
    const ban = banInfo.get(info.idNguoiBan);
    let nhom = nhomBySeller.get(info.idNguoiBan);
    if (!nhom) {
      nhom = {
        idNguoiBan: info.idNguoiBan,
        idCuaHang: ban?.idCuaHang ?? null,
        tenCuaHang: ban?.tenCuaHang ?? "Cửa hàng",
        sellerSlug: ban?.sellerSlug ?? null,
        avatarUrl: ban?.avatarUrl ?? null,
        coThanhToan: ban?.coThanhToan ?? false,
        dong: [],
        tongTien: 0,
        tienTe: info.tienTe,
        coVanDe: false,
      };
      nhomBySeller.set(info.idNguoiBan, nhom);
    }
    const gia = info.giaHienThi ?? 0;
    const dong: ShopGioChungDong = {
      idBienThe: info.idBienThe,
      idSanPham: info.idSanPham,
      idNguoiBan: info.idNguoiBan,
      soLuong: d.so_luong,
      tenSanPham: info.tenSanPham,
      nhanBienThe: info.nhanBienThe,
      giaHienThi: gia,
      tienTe: info.tienTe,
      anhUrl: info.anhUrl,
      soLuongTon: info.soLuongTon,
      ngungBan: info.ngungBan,
    };
    nhom.dong.push(dong);
    nhom.tienTe = info.tienTe;
    if (!info.ngungBan) nhom.tongTien += gia * d.so_luong;
    if (info.ngungBan || info.soLuongTon < d.so_luong) nhom.coVanDe = true;
  }

  const nhom = [...nhomBySeller.values()].sort((a, b) =>
    a.tenCuaHang.localeCompare(b.tenCuaHang, "vi"),
  );
  return { id: gioId, nhom, tongSoDong };
}

async function getOrCreateGioChungId(buyerId: string): Promise<string> {
  const existing = await findGioChungId(buyerId);
  if (existing) return existing;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_gio")
    .insert({ id_nguoi_mua: buyerId, id_cot_moc: null, id_cua_hang: null })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    /* Race unique → đọc lại. */
    const again = await findGioChungId(buyerId);
    if (again) return again;
    throw new Error("CART_FAILED");
  }
  return data.id;
}

/** Đặt số lượng một biến thể trong giỏ chung (0 = xóa dòng). */
export async function setGioChungDong(
  buyerId: string,
  idBienThe: string,
  soLuong: number,
): Promise<ShopGioChung> {
  const qty = Math.trunc(soLuong);
  if (qty < 0) throw new Error("INVALID_QTY");

  const admin = createServiceRoleClient();

  if (qty === 0) {
    const gioId = await findGioChungId(buyerId);
    if (gioId) {
      await admin
        .from("shop_gio_dong")
        .delete()
        .eq("id_gio", gioId)
        .eq("id_bien_the", idBienThe);
      await touchGio(gioId);
    }
    return getGioChung(buyerId);
  }

  const info = (await resolveBienThe([idBienThe])).get(idBienThe);
  if (!info) throw new Error("ITEM_NOT_FOUND");
  if (info.idNguoiBan === buyerId) throw new Error("CANNOT_BUY_OWN");
  if (info.ngungBan) throw new Error("ITEM_UNAVAILABLE");
  if (info.soLuongTon <= 0) throw new Error("STOCK_EMPTY");
  if (qty > info.soLuongTon) throw new Error("STOCK_INSUFFICIENT");
  await assertShopNotTamDong(info.idNguoiBan);

  const gioId = await getOrCreateGioChungId(buyerId);
  await upsertDong(gioId, idBienThe, qty);
  await touchGio(gioId);
  return getGioChung(buyerId);
}

/**
 * Cộng thêm `delta` vào dòng giỏ (không cần client GET trước).
 * Chặn vượt tồn kho.
 */
export async function addGioChungDong(
  buyerId: string,
  idBienThe: string,
  delta: number,
): Promise<ShopGioChung> {
  const d = Math.trunc(delta);
  if (d <= 0) throw new Error("INVALID_QTY");

  const info = (await resolveBienThe([idBienThe])).get(idBienThe);
  if (!info) throw new Error("ITEM_NOT_FOUND");
  if (info.idNguoiBan === buyerId) throw new Error("CANNOT_BUY_OWN");
  if (info.ngungBan) throw new Error("ITEM_UNAVAILABLE");
  if (info.soLuongTon <= 0) throw new Error("STOCK_EMPTY");
  await assertShopNotTamDong(info.idNguoiBan);

  const gioId = await getOrCreateGioChungId(buyerId);
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("shop_gio_dong")
    .select("id, so_luong")
    .eq("id_gio", gioId)
    .eq("id_bien_the", idBienThe)
    .maybeSingle<{ id: string; so_luong: number }>();

  const current = Math.max(0, Math.trunc(existing?.so_luong ?? 0));
  const qty = Math.min(current + d, info.soLuongTon);
  if (qty <= current) throw new Error("STOCK_INSUFFICIENT");

  await upsertDong(gioId, idBienThe, qty);
  await touchGio(gioId);
  return getGioChung(buyerId);
}

async function upsertDong(
  gioId: string,
  idBienThe: string,
  qty: number,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("shop_gio_dong")
    .select("id")
    .eq("id_gio", gioId)
    .eq("id_bien_the", idBienThe)
    .maybeSingle<{ id: string }>();
  if (existing) {
    await admin
      .from("shop_gio_dong")
      .update({ so_luong: qty })
      .eq("id", existing.id);
  } else {
    await admin
      .from("shop_gio_dong")
      .insert({ id_gio: gioId, id_bien_the: idBienThe, so_luong: qty });
  }
}

async function touchGio(gioId: string): Promise<void> {
  const admin = createServiceRoleClient();
  await admin
    .from("shop_gio")
    .update({ cap_nhat_luc: new Date().toISOString() })
    .eq("id", gioId);
}

/** Xóa toàn bộ dòng của một seller khỏi giỏ chung (sau khi gửi đơn). */
export async function clearGioChungCuaSeller(
  buyerId: string,
  sellerId: string,
): Promise<void> {
  const gioId = await findGioChungId(buyerId);
  if (!gioId) return;

  const admin = createServiceRoleClient();
  const { data: dongRows } = await admin
    .from("shop_gio_dong")
    .select("id, id_bien_the")
    .eq("id_gio", gioId);
  const dongs = (dongRows ?? []) as Array<{ id: string; id_bien_the: string }>;
  if (dongs.length === 0) return;

  const btInfo = await resolveBienThe(dongs.map((d) => d.id_bien_the));
  const toDelete = dongs
    .filter((d) => btInfo.get(d.id_bien_the)?.idNguoiBan === sellerId)
    .map((d) => d.id);
  if (toDelete.length === 0) return;

  await admin.from("shop_gio_dong").delete().in("id", toDelete);
  await touchGio(gioId);
}

/** Xóa sạch giỏ chung. */
export async function clearGioChung(buyerId: string): Promise<ShopGioChung> {
  const gioId = await findGioChungId(buyerId);
  if (gioId) {
    const admin = createServiceRoleClient();
    await admin.from("shop_gio_dong").delete().eq("id_gio", gioId);
    await touchGio(gioId);
  }
  return getGioChung(buyerId);
}
