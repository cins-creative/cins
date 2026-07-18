import "server-only";

import { getGio } from "@/lib/shop/gio";
import { shopTermsSnapshot } from "@/lib/shop/terms";
import type {
  ShopDonHang,
  ShopDonHangDong,
  ShopLoaiDon,
  ShopTrangThaiDon,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type DonRow = {
  id: string;
  id_nguoi_mua: string;
  id_nguoi_ban: string;
  id_cot_moc: string | null;
  id_su_kien: string | null;
  loai_don: ShopLoaiDon;
  trang_thai: ShopTrangThaiDon;
  tien_te: string;
  tong_tien: number | string;
  ghi_chu: string | null;
  da_tru_kho: boolean;
  tao_luc: string;
  xac_nhan_luc: string | null;
};

type DongRow = {
  id: string;
  id_don_hang: string;
  id_bien_the: string | null;
  ten_snapshot: string;
  nhan_snapshot: string | null;
  so_luong: number;
  gia_don_vi: number | string;
};

function mapDong(d: DongRow): ShopDonHangDong {
  return {
    id: d.id,
    idBienThe: d.id_bien_the,
    tenSnapshot: d.ten_snapshot,
    nhanSnapshot: d.nhan_snapshot,
    soLuong: d.so_luong,
    giaDonVi: Number(d.gia_don_vi),
  };
}

async function attachDong(dons: DonRow[]): Promise<ShopDonHang[]> {
  if (dons.length === 0) return [];
  const admin = createServiceRoleClient();
  const ids = dons.map((d) => d.id);
  const { data: dongs } = await admin
    .from("shop_don_hang_dong")
    .select(
      "id, id_don_hang, id_bien_the, ten_snapshot, nhan_snapshot, so_luong, gia_don_vi",
    )
    .in("id_don_hang", ids);
  const byDon = new Map<string, ShopDonHangDong[]>();
  for (const d of (dongs ?? []) as DongRow[]) {
    const list = byDon.get(d.id_don_hang) ?? [];
    list.push(mapDong(d));
    byDon.set(d.id_don_hang, list);
  }

  const userIds = [
    ...new Set(dons.flatMap((d) => [d.id_nguoi_mua, d.id_nguoi_ban])),
  ];
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, ten_hien_thi")
    .in("id", userIds);
  const nameMap = new Map(
    ((users ?? []) as Array<{ id: string; ten_hien_thi: string | null }>).map(
      (u) => [u.id, u.ten_hien_thi],
    ),
  );

  return dons.map((d) => ({
    id: d.id,
    idNguoiMua: d.id_nguoi_mua,
    idNguoiBan: d.id_nguoi_ban,
    idCotMoc: d.id_cot_moc,
    idSuKien: d.id_su_kien,
    loaiDon: d.loai_don,
    trangThai: d.trang_thai,
    tienTe: d.tien_te,
    tongTien: Number(d.tong_tien),
    ghiChu: d.ghi_chu,
    daTruKho: d.da_tru_kho,
    dong: byDon.get(d.id) ?? [],
    muaTen: nameMap.get(d.id_nguoi_mua) ?? null,
    banTen: nameMap.get(d.id_nguoi_ban) ?? null,
    taoLuc: d.tao_luc,
    xacNhanLuc: d.xac_nhan_luc,
  }));
}

export async function getDonHang(donId: string): Promise<ShopDonHang | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_don_hang")
    .select(
      "id, id_nguoi_mua, id_nguoi_ban, id_cot_moc, id_su_kien, loai_don, trang_thai, tien_te, tong_tien, ghi_chu, da_tru_kho, tao_luc, xac_nhan_luc",
    )
    .eq("id", donId)
    .maybeSingle<DonRow>();
  if (!data) return null;
  const [mapped] = await attachDong([data]);
  return mapped ?? null;
}

export async function listDonHangForUser(
  userId: string,
  role: "seller" | "buyer",
  limit = 50,
): Promise<ShopDonHang[]> {
  const admin = createServiceRoleClient();
  const col = role === "seller" ? "id_nguoi_ban" : "id_nguoi_mua";
  const { data, error } = await admin
    .from("shop_don_hang")
    .select(
      "id, id_nguoi_mua, id_nguoi_ban, id_cot_moc, id_su_kien, loai_don, trang_thai, tien_te, tong_tien, ghi_chu, da_tru_kho, tao_luc, xac_nhan_luc",
    )
    .eq(col, userId)
    .order("tao_luc", { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) {
    console.error("[shop] listDonHang", error);
    throw new Error("LIST_FAILED");
  }
  return attachDong((data ?? []) as DonRow[]);
}

export async function createDonFromGio(
  buyerId: string,
  input: {
    cotMocId: string;
    loaiDon: ShopLoaiDon;
    idSuKien?: string | null;
    ghiChu?: string | null;
  },
): Promise<ShopDonHang> {
  const gio = await getGio(buyerId, input.cotMocId);
  if (gio.dong.length === 0) throw new Error("CART_EMPTY");

  const admin = createServiceRoleClient();
  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", input.cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();
  if (!moc) throw new Error("POST_NOT_FOUND");
  if (moc.id_nguoi_dung === buyerId) throw new Error("CANNOT_BUY_OWN");

  if (input.loaiDon === "dat_truoc_nhan_su_kien" && !input.idSuKien) {
    throw new Error("SU_KIEN_REQUIRED");
  }

  const { data: don, error } = await admin
    .from("shop_don_hang")
    .insert({
      id_nguoi_mua: buyerId,
      id_nguoi_ban: moc.id_nguoi_dung,
      id_cot_moc: input.cotMocId,
      id_su_kien: input.idSuKien ?? null,
      loai_don: input.loaiDon,
      trang_thai: "cho_xac_nhan",
      tien_te: gio.tienTe,
      tong_tien: gio.tongTien,
      ghi_chu: input.ghiChu?.trim() || null,
      dieu_khoan_snapshot: shopTermsSnapshot(),
      da_tru_kho: false,
    })
    .select(
      "id, id_nguoi_mua, id_nguoi_ban, id_cot_moc, id_su_kien, loai_don, trang_thai, tien_te, tong_tien, ghi_chu, da_tru_kho, tao_luc, xac_nhan_luc",
    )
    .single<DonRow>();
  if (error || !don) {
    console.error("[shop] createDon", error);
    throw new Error("CREATE_FAILED");
  }

  const { error: dongErr } = await admin.from("shop_don_hang_dong").insert(
    gio.dong.map((d) => ({
      id_don_hang: don.id,
      id_bien_the: d.idBienThe,
      ten_snapshot: d.tenSanPham,
      nhan_snapshot: d.nhanBienThe,
      so_luong: d.soLuong,
      gia_don_vi: d.giaHienThi,
    })),
  );
  if (dongErr) {
    console.error("[shop] createDonDong", dongErr);
    await admin.from("shop_don_hang").delete().eq("id", don.id);
    throw new Error("CREATE_FAILED");
  }

  // Clear cart after order
  if (gio.id) {
    await admin.from("shop_gio_dong").delete().eq("id_gio", gio.id);
  }

  const [mapped] = await attachDong([don]);
  return mapped!;
}

async function adjustStock(
  dongs: ShopDonHangDong[],
  direction: "tru" | "hoan",
): Promise<void> {
  const admin = createServiceRoleClient();
  for (const d of dongs) {
    if (!d.idBienThe) continue;
    const { data: bt } = await admin
      .from("shop_bien_the")
      .select("so_luong_ton")
      .eq("id", d.idBienThe)
      .maybeSingle<{ so_luong_ton: number }>();
    if (!bt) continue;
    const next =
      direction === "tru"
        ? bt.so_luong_ton - d.soLuong
        : bt.so_luong_ton + d.soLuong;
    await admin
      .from("shop_bien_the")
      .update({
        so_luong_ton: next,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", d.idBienThe);
  }
}

export async function confirmDonHang(
  actorId: string,
  donId: string,
  action: "da_nhan_tien" | "da_giao_tai_su_kien",
): Promise<ShopDonHang> {
  const don = await getDonHang(donId);
  if (!don) throw new Error("NOT_FOUND");
  if (don.idNguoiBan !== actorId) throw new Error("FORBIDDEN");
  if (don.trangThai !== "cho_xac_nhan") throw new Error("INVALID_STATE");

  if (action === "da_giao_tai_su_kien" && don.loaiDon !== "dat_truoc_nhan_su_kien") {
    throw new Error("INVALID_ACTION");
  }

  if (!don.daTruKho) {
    await adjustStock(don.dong, "tru");
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("shop_don_hang")
    .update({
      trang_thai: action,
      da_tru_kho: true,
      xac_nhan_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", donId);
  if (error) throw new Error("UPDATE_FAILED");

  const updated = await getDonHang(donId);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export async function cancelDonHang(
  actorId: string,
  donId: string,
): Promise<ShopDonHang> {
  const don = await getDonHang(donId);
  if (!don) throw new Error("NOT_FOUND");
  if (don.idNguoiBan !== actorId && don.idNguoiMua !== actorId) {
    throw new Error("FORBIDDEN");
  }
  if (don.trangThai === "huy") return don;
  if (
    don.trangThai === "da_nhan_tien" ||
    don.trangThai === "da_giao_tai_su_kien"
  ) {
    if (don.idNguoiBan !== actorId) throw new Error("FORBIDDEN");
    if (don.daTruKho) await adjustStock(don.dong, "hoan");
  } else if (don.trangThai !== "cho_xac_nhan" && don.trangThai !== "nhap") {
    throw new Error("INVALID_STATE");
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  await admin
    .from("shop_don_hang")
    .update({
      trang_thai: "huy",
      da_tru_kho: false,
      huy_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", donId);

  const updated = await getDonHang(donId);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export function donHangToChatContext(don: ShopDonHang): {
  loai: "don_hang";
  id: string;
  tieuDe: string;
  moTa: string;
  href: string;
} {
  const lines = don.dong
    .map(
      (d) =>
        `• ${d.tenSnapshot}${d.nhanSnapshot ? ` (${d.nhanSnapshot})` : ""} ×${d.soLuong} — ${d.giaDonVi.toLocaleString("vi-VN")} ${don.tienTe}`,
    )
    .join("\n");
  return {
    loai: "don_hang",
    id: don.id,
    tieuDe: `Đơn hàng #${don.id.slice(0, 8)}`,
    moTa: `${lines}\nTổng: ${don.tongTien.toLocaleString("vi-VN")} ${don.tienTe}`,
    href: `/ban-hang/don?id=${don.id}`,
  };
}
