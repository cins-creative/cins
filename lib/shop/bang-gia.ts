import "server-only";

import { assertShopReady } from "@/lib/shop/cua-hang";
import type { ShopBangGia } from "@/lib/shop/types";
import { shopGiaHieuLuc } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type BgRow = {
  id: string;
  ten: string;
  tien_te: string;
  ghi_chu: string | null;
  tao_luc: string;
};

type DongRow = {
  id: string;
  id_bang_gia: string;
  id_bien_the: string;
  gia: number | string;
  gia_giam: number | string | null;
};

export type ShopBangGiaDongInput = {
  idBienThe: string;
  gia: number;
  giaGiam?: number | null;
};

function mapDong(d: DongRow): ShopBangGia["dong"][number] {
  return {
    id: d.id,
    idBienThe: d.id_bien_the,
    gia: Number(d.gia),
    giaGiam: d.gia_giam == null ? null : Number(d.gia_giam),
  };
}

function normalizeDongInput(
  d: ShopBangGiaDongInput,
): { id_bien_the: string; gia: number; gia_giam: number | null } {
  const giaGiam =
    d.giaGiam == null || Number.isNaN(Number(d.giaGiam))
      ? null
      : Number(d.giaGiam);
  return {
    id_bien_the: d.idBienThe,
    gia: d.gia,
    gia_giam: giaGiam,
  };
}

export async function listBangGia(ownerId: string): Promise<ShopBangGia[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_bang_gia")
    .select("id, ten, tien_te, ghi_chu, tao_luc")
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(100);
  if (error) throw new Error("LIST_FAILED");
  const rows = (data ?? []) as BgRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: dongs } = await admin
    .from("shop_bang_gia_dong")
    .select("id, id_bang_gia, id_bien_the, gia, gia_giam")
    .in("id_bang_gia", ids);
  const byBg = new Map<string, ShopBangGia["dong"]>();
  for (const d of (dongs ?? []) as DongRow[]) {
    const list = byBg.get(d.id_bang_gia) ?? [];
    list.push(mapDong(d));
    byBg.set(d.id_bang_gia, list);
  }
  return rows.map((r) => ({
    id: r.id,
    ten: r.ten,
    tienTe: r.tien_te,
    ghiChu: r.ghi_chu,
    dong: byBg.get(r.id) ?? [],
    taoLuc: r.tao_luc,
  }));
}

export async function createBangGia(
  ownerId: string,
  input: {
    ten: string;
    tienTe?: string;
    ghiChu?: string | null;
    dong?: ShopBangGiaDongInput[];
  },
): Promise<ShopBangGia> {
  await assertShopReady(ownerId);
  const ten = input.ten.trim();
  if (!ten) throw new Error("TEN_REQUIRED");
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_bang_gia")
    .insert({
      id_nguoi_dung: ownerId,
      ten,
      tien_te: (input.tienTe ?? "VND").trim() || "VND",
      ghi_chu: input.ghiChu?.trim() || null,
    })
    .select("id, ten, tien_te, ghi_chu, tao_luc")
    .single<BgRow>();
  if (error || !data) throw new Error("CREATE_FAILED");

  let dong: ShopBangGia["dong"] = [];
  if (input.dong && input.dong.length > 0) {
    const { data: inserted } = await admin
      .from("shop_bang_gia_dong")
      .insert(input.dong.map(normalizeDongInput).map((row) => ({
        id_bang_gia: data.id,
        ...row,
      })))
      .select("id, id_bang_gia, id_bien_the, gia, gia_giam");
    dong = ((inserted ?? []) as DongRow[]).map(mapDong);
  }

  return {
    id: data.id,
    ten: data.ten,
    tienTe: data.tien_te,
    ghiChu: data.ghi_chu,
    dong,
    taoLuc: data.tao_luc,
  };
}

export async function updateBangGia(
  ownerId: string,
  bangGiaId: string,
  input: {
    ten?: string;
    tienTe?: string;
    ghiChu?: string | null;
    dong?: ShopBangGiaDongInput[];
  },
): Promise<void> {
  await assertShopReady(ownerId);
  const admin = createServiceRoleClient();
  const { data: bg } = await admin
    .from("shop_bang_gia")
    .select("id")
    .eq("id", bangGiaId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle();
  if (!bg) throw new Error("NOT_FOUND");

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (typeof input.ten === "string") {
    const ten = input.ten.trim();
    if (!ten) throw new Error("TEN_REQUIRED");
    patch.ten = ten;
  }
  if (typeof input.tienTe === "string") {
    patch.tien_te = input.tienTe.trim() || "VND";
  }
  if (input.ghiChu !== undefined) patch.ghi_chu = input.ghiChu?.trim() || null;

  await admin.from("shop_bang_gia").update(patch).eq("id", bangGiaId);

  if (input.dong) {
    await admin.from("shop_bang_gia_dong").delete().eq("id_bang_gia", bangGiaId);
    if (input.dong.length > 0) {
      await admin.from("shop_bang_gia_dong").insert(
        input.dong.map(normalizeDongInput).map((row) => ({
          id_bang_gia: bangGiaId,
          ...row,
        })),
      );
    }
  }
}

export async function softDeleteBangGia(
  ownerId: string,
  bangGiaId: string,
): Promise<void> {
  await assertShopReady(ownerId);
  const admin = createServiceRoleClient();
  const { error, count } = await admin
    .from("shop_bang_gia")
    .update(
      { da_xoa: true, cap_nhat_luc: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", bangGiaId)
    .eq("id_nguoi_dung", ownerId);
  if (error || !count) throw new Error("DELETE_FAILED");
}

/**
 * Giá gắn kiosk / đơn: ưu tiên `gia_giam` nếu có, không thì `gia`.
 */
export async function resolveGiaBienThe(
  bangGiaId: string,
  bienTheId: string,
): Promise<{ gia: number; giaBan: number; giaGiam: number | null; tienTe: string } | null> {
  const admin = createServiceRoleClient();
  const { data: bg } = await admin
    .from("shop_bang_gia")
    .select("id, tien_te")
    .eq("id", bangGiaId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string; tien_te: string }>();
  if (!bg) return null;
  const { data: dong } = await admin
    .from("shop_bang_gia_dong")
    .select("gia, gia_giam")
    .eq("id_bang_gia", bangGiaId)
    .eq("id_bien_the", bienTheId)
    .maybeSingle<{ gia: number | string; gia_giam: number | string | null }>();
  if (!dong) return null;
  const giaBan = Number(dong.gia);
  const giaGiam = dong.gia_giam == null ? null : Number(dong.gia_giam);
  return {
    gia: shopGiaHieuLuc({ gia: giaBan, giaGiam }),
    giaBan,
    giaGiam,
    tienTe: bg.tien_te,
  };
}
