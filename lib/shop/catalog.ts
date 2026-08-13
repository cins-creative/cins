import "server-only";

import { parseShopThumbFit, type ShopThumbFit } from "@/lib/shop/anh-thumb-fit";
import { assertShopReady } from "@/lib/shop/cua-hang";
import { resolvePhanLoaiPatch } from "@/lib/shop/nhom";
import { shopImageUrl } from "@/lib/shop/settings";
import type { ShopBienThe, ShopSanPham } from "@/lib/shop/types";
import { SHOP_FEATURE_MAX } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type SpRow = {
  id: string;
  ten: string;
  mo_ta: string | null;
  anh_id: string | null;
  phan_loai: string | null;
  phan_loai_2: string | null;
  id_nhom: string | null;
  id_nhom_2: string | null;
  dang_ban: boolean;
  noi_bat: boolean;
  anh_thumb_fit?: string | null;
  tao_luc: string;
};

const SP_SELECT =
  "id, ten, mo_ta, anh_id, phan_loai, phan_loai_2, id_nhom, id_nhom_2, dang_ban, noi_bat, anh_thumb_fit, tao_luc";

type BtRow = {
  id: string;
  id_san_pham: string;
  nhan: string;
  sku: string | null;
  so_luong_ton: number;
  can_nang: number | null;
  anh_id: string | null;
};

function mapBienThe(row: BtRow): ShopBienThe {
  return {
    id: row.id,
    idSanPham: row.id_san_pham,
    nhan: row.nhan,
    sku: row.sku,
    soLuongTon: row.so_luong_ton,
    canNang:
      row.can_nang != null && Number.isFinite(Number(row.can_nang))
        ? Math.max(0, Math.trunc(Number(row.can_nang)))
        : null,
    anhId: row.anh_id,
    anhUrl: shopImageUrl(row.anh_id),
  };
}

function mapSanPham(row: SpRow, bienThe: ShopBienThe[]): ShopSanPham {
  return {
    id: row.id,
    ten: row.ten,
    moTa: row.mo_ta,
    anhId: row.anh_id,
    anhUrl: shopImageUrl(row.anh_id),
    anhThumbFit: parseShopThumbFit(row.anh_thumb_fit),
    phanLoai: row.phan_loai,
    phanLoai2: row.phan_loai_2,
    idNhom: row.id_nhom,
    idNhom2: row.id_nhom_2,
    dangBan: row.dang_ban,
    noiBat: row.noi_bat === true,
    bienThe,
    taoLuc: row.tao_luc,
  };
}

export async function listSanPham(
  ownerId: string,
  opts?: { idNhom?: string },
): Promise<ShopSanPham[]> {
  const admin = createServiceRoleClient();
  const idNhom = opts?.idNhom?.trim() || null;
  let q = admin
    .from("shop_san_pham")
    .select(SP_SELECT)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(200);
  if (idNhom) q = q.eq("id_nhom", idNhom);
  const { data: sps, error } = await q;
  if (error) {
    console.error("[shop] listSanPham", error);
    throw new Error("LIST_FAILED");
  }
  const rows = (sps ?? []) as SpRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: bts } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham, nhan, sku, so_luong_ton, can_nang, anh_id")
    .in("id_san_pham", ids)
    .eq("da_xoa", false);
  const bySp = new Map<string, ShopBienThe[]>();
  for (const bt of (bts ?? []) as BtRow[]) {
    const list = bySp.get(bt.id_san_pham) ?? [];
    list.push(mapBienThe(bt));
    bySp.set(bt.id_san_pham, list);
  }
  return rows.map((r) => mapSanPham(r, bySp.get(r.id) ?? []));
}

/** Đếm mẫu (da_xoa=false) đang gắn `id_nhom` — dùng gate xóa loại hàng. */
export async function countSanPhamByNhom(
  ownerId: string,
  nhomId: string,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("shop_san_pham")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", ownerId)
    .eq("id_nhom", nhomId)
    .eq("da_xoa", false);
  if (error) {
    console.error("[shop] countSanPhamByNhom", error);
    throw new Error("COUNT_FAILED");
  }
  return count ?? 0;
}

/** Đếm mẫu (da_xoa=false) CHƯA gắn loại (id_nhom IS NULL) — thẻ «Chưa gán loại». */
export async function countOrphanSanPham(ownerId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("shop_san_pham")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .is("id_nhom", null);
  if (error) {
    console.error("[shop] countOrphanSanPham", error);
    throw new Error("COUNT_FAILED");
  }
  return count ?? 0;
}

export async function createSanPham(
  ownerId: string,
  input: {
    ten: string;
    moTa?: string | null;
    anhId?: string | null;
    phanLoai?: string | null;
    phanLoai2?: string | null;
    bienThe?: Array<{
      nhan?: string;
      sku?: string | null;
      soLuongTon?: number;
      canNang?: number | null;
      anhId?: string | null;
    }>;
  },
): Promise<ShopSanPham> {
  await assertShopReady(ownerId);
  const ten = input.ten.trim();
  if (!ten) throw new Error("TEN_REQUIRED");

  const nhomPatch = await resolvePhanLoaiPatch(ownerId, {
    phanLoai: input.phanLoai ?? null,
    phanLoai2: input.phanLoai2 ?? null,
  });

  const admin = createServiceRoleClient();
  const { data: sp, error } = await admin
    .from("shop_san_pham")
    .insert({
      id_nguoi_dung: ownerId,
      ten,
      mo_ta: input.moTa?.trim() || null,
      anh_id: input.anhId?.trim() || null,
      phan_loai: nhomPatch.phan_loai,
      phan_loai_2: nhomPatch.phan_loai_2,
      id_nhom: nhomPatch.id_nhom,
      id_nhom_2: nhomPatch.id_nhom_2,
      dang_ban: false,
    })
    .select(SP_SELECT)
    .single<SpRow>();
  if (error || !sp) {
    console.error("[shop] createSanPham", error);
    throw new Error("CREATE_FAILED");
  }

  const variants =
    input.bienThe && input.bienThe.length > 0
      ? input.bienThe
      : [{ nhan: "Mặc định", soLuongTon: 0 }];

  const { data: bts, error: btErr } = await admin
    .from("shop_bien_the")
    .insert(
      variants.map((v) => ({
        id_san_pham: sp.id,
        nhan: (v.nhan ?? "Mặc định").trim() || "Mặc định",
        sku: v.sku?.trim() || null,
        so_luong_ton: Math.trunc(v.soLuongTon ?? 0),
        can_nang:
          v.canNang != null && Number.isFinite(Number(v.canNang))
            ? Math.max(1, Math.trunc(Number(v.canNang)))
            : null,
        anh_id: v.anhId?.trim() || null,
      })),
    )
    .select("id, id_san_pham, nhan, sku, so_luong_ton, can_nang, anh_id");
  if (btErr) {
    console.error("[shop] createBienThe", btErr);
  }

  return mapSanPham(sp, ((bts ?? []) as BtRow[]).map(mapBienThe));
}

export async function updateSanPham(
  ownerId: string,
  sanPhamId: string,
  input: {
    ten?: string;
    moTa?: string | null;
    anhId?: string | null;
    phanLoai?: string | null;
    phanLoai2?: string | null;
    dangBan?: boolean;
    noiBat?: boolean;
  },
): Promise<void> {
  await assertShopReady(ownerId);
  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (typeof input.ten === "string") {
    const ten = input.ten.trim();
    if (!ten) throw new Error("TEN_REQUIRED");
    patch.ten = ten;
  }
  if (input.moTa !== undefined) patch.mo_ta = input.moTa?.trim() || null;
  if (input.anhId !== undefined) patch.anh_id = input.anhId?.trim() || null;
  if (input.phanLoai !== undefined || input.phanLoai2 !== undefined) {
    const nhomPatch = await resolvePhanLoaiPatch(ownerId, {
      phanLoai: input.phanLoai,
      phanLoai2: input.phanLoai2,
    });
    Object.assign(patch, nhomPatch);
  }
  if (typeof input.dangBan === "boolean") {
    patch.dang_ban = input.dangBan;
  }
  if (typeof input.noiBat === "boolean") {
    if (input.noiBat === true) {
      const { count: featuredCount, error: featErr } = await admin
        .from("shop_san_pham")
        .select("id", { count: "exact", head: true })
        .eq("id_nguoi_dung", ownerId)
        .eq("da_xoa", false)
        .eq("noi_bat", true)
        .neq("id", sanPhamId);
      if (featErr) {
        console.error("[shop] updateSanPham feature count", featErr);
        throw new Error("UPDATE_FAILED");
      }
      if ((featuredCount ?? 0) >= SHOP_FEATURE_MAX) {
        throw new Error("FEATURE_LIMIT");
      }
    }
    patch.noi_bat = input.noiBat;
  }

  const { error, count } = await admin
    .from("shop_san_pham")
    .update(patch, { count: "exact" })
    .eq("id", sanPhamId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false);
  if (error || !count) {
    if (error) console.error("[shop] updateSanPham", error);
    throw new Error("UPDATE_FAILED");
  }
}

/** Chỉ cột hiển thị ảnh — không gate shop-ready, 1 round-trip. */
export async function updateSanPhamAnhThumbFit(
  ownerId: string,
  sanPhamId: string,
  fit: ShopThumbFit,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { error, count } = await admin
    .from("shop_san_pham")
    .update({ anh_thumb_fit: fit }, { count: "exact" })
    .eq("id", sanPhamId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false);
  if (error || !count) {
    if (error) console.error("[shop] updateSanPhamAnhThumbFit", error);
    throw new Error("UPDATE_FAILED");
  }
}

export async function softDeleteSanPham(
  ownerId: string,
  sanPhamId: string,
): Promise<void> {
  await assertShopReady(ownerId);
  const admin = createServiceRoleClient();
  const { error, count } = await admin
    .from("shop_san_pham")
    .update(
      { da_xoa: true, cap_nhat_luc: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", sanPhamId)
    .eq("id_nguoi_dung", ownerId);
  if (error || !count) throw new Error("DELETE_FAILED");
}

export async function upsertBienThe(
  ownerId: string,
  sanPhamId: string,
  input: {
    id?: string;
    nhan: string;
    sku?: string | null;
    soLuongTon: number;
    canNang?: number | null;
    anhId?: string | null;
  },
): Promise<ShopBienThe> {
  await assertShopReady(ownerId);
  const admin = createServiceRoleClient();
  const { data: sp } = await admin
    .from("shop_san_pham")
    .select("id")
    .eq("id", sanPhamId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle();
  if (!sp) throw new Error("NOT_FOUND");

  const payload: Record<string, unknown> = {
    id_san_pham: sanPhamId,
    nhan: input.nhan.trim() || "Mặc định",
    sku: input.sku?.trim() || null,
    so_luong_ton: Math.trunc(input.soLuongTon),
    anh_id: input.anhId?.trim() || null,
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.canNang !== undefined) {
    payload.can_nang =
      input.canNang != null && Number.isFinite(Number(input.canNang))
        ? Math.max(1, Math.trunc(Number(input.canNang)))
        : null;
  }

  if (input.id) {
    const { data, error } = await admin
      .from("shop_bien_the")
      .update(payload)
      .eq("id", input.id)
      .eq("id_san_pham", sanPhamId)
      .select("id, id_san_pham, nhan, sku, so_luong_ton, can_nang, anh_id")
      .maybeSingle<BtRow>();
    if (error || !data) throw new Error("UPDATE_FAILED");

    return mapBienThe(data);
  }

  const { data, error } = await admin
    .from("shop_bien_the")
    .insert(payload)
    .select("id, id_san_pham, nhan, sku, so_luong_ton, can_nang, anh_id")
    .single<BtRow>();
  if (error || !data) throw new Error("CREATE_FAILED");
  return mapBienThe(data);
}

export async function softDeleteBienThe(
  ownerId: string,
  bienTheId: string,
): Promise<void> {
  await assertShopReady(ownerId);
  const admin = createServiceRoleClient();
  const { data: bt } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham")
    .eq("id", bienTheId)
    .maybeSingle<{ id: string; id_san_pham: string }>();
  if (!bt) throw new Error("NOT_FOUND");
  const { data: sp } = await admin
    .from("shop_san_pham")
    .select("id")
    .eq("id", bt.id_san_pham)
    .eq("id_nguoi_dung", ownerId)
    .maybeSingle();
  if (!sp) throw new Error("FORBIDDEN");
  await admin
    .from("shop_bien_the")
    .update({ da_xoa: true, cap_nhat_luc: new Date().toISOString() })
    .eq("id", bienTheId);
}
