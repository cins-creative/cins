import "server-only";

import { assertBanHangEnabled } from "@/lib/shop/settings";
import type { ShopBangGia } from "@/lib/shop/types";
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
};

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
    .select("id, id_bang_gia, id_bien_the, gia")
    .in("id_bang_gia", ids);
  const byBg = new Map<string, ShopBangGia["dong"]>();
  for (const d of (dongs ?? []) as DongRow[]) {
    const list = byBg.get(d.id_bang_gia) ?? [];
    list.push({
      id: d.id,
      idBienThe: d.id_bien_the,
      gia: Number(d.gia),
    });
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
    dong?: Array<{ idBienThe: string; gia: number }>;
  },
): Promise<ShopBangGia> {
  await assertBanHangEnabled(ownerId);
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
      .insert(
        input.dong.map((d) => ({
          id_bang_gia: data.id,
          id_bien_the: d.idBienThe,
          gia: d.gia,
        })),
      )
      .select("id, id_bang_gia, id_bien_the, gia");
    dong = ((inserted ?? []) as DongRow[]).map((d) => ({
      id: d.id,
      idBienThe: d.id_bien_the,
      gia: Number(d.gia),
    }));
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
    dong?: Array<{ idBienThe: string; gia: number }>;
  },
): Promise<void> {
  await assertBanHangEnabled(ownerId);
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
        input.dong.map((d) => ({
          id_bang_gia: bangGiaId,
          id_bien_the: d.idBienThe,
          gia: d.gia,
        })),
      );
    }
  }
}

export async function softDeleteBangGia(
  ownerId: string,
  bangGiaId: string,
): Promise<void> {
  await assertBanHangEnabled(ownerId);
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

export async function resolveGiaBienThe(
  bangGiaId: string,
  bienTheId: string,
): Promise<{ gia: number; tienTe: string } | null> {
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
    .select("gia")
    .eq("id_bang_gia", bangGiaId)
    .eq("id_bien_the", bienTheId)
    .maybeSingle<{ gia: number | string }>();
  if (!dong) return null;
  return { gia: Number(dong.gia), tienTe: bg.tien_te };
}
