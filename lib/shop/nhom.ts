import "server-only";

import { assertBanHangEnabled } from "@/lib/shop/settings";
import type { ShopNhom, ShopNhomTruc } from "@/lib/shop/types";
import { SHOP_NHOM_MO_TA_MAX } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const SHOP_NHOM_NHAN_MAX = 40;

type NhomRow = {
  id: string;
  id_nguoi_dung: string;
  truc: number;
  nhan: string;
  mo_ta: string | null;
  thu_tu: number;
  tao_luc: string;
};

function mapNhom(row: NhomRow): ShopNhom {
  return {
    id: row.id,
    truc: row.truc === 2 ? 2 : 1,
    nhan: row.nhan,
    moTa: row.mo_ta?.trim() || null,
    thuTu: row.thu_tu,
    taoLuc: row.tao_luc,
  };
}

function normalizeNhan(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return t.length > SHOP_NHOM_NHAN_MAX ? t.slice(0, SHOP_NHOM_NHAN_MAX) : t;
}

function normalizeMoTa(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.length > SHOP_NHOM_MO_TA_MAX
    ? t.slice(0, SHOP_NHOM_MO_TA_MAX)
    : t;
}

export async function listNhom(
  ownerId: string,
  truc?: ShopNhomTruc,
): Promise<ShopNhom[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_nhom")
    .select("id, id_nguoi_dung, truc, nhan, mo_ta, thu_tu, tao_luc")
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .order("thu_tu", { ascending: true })
    .order("nhan", { ascending: true })
    .limit(200);
  if (truc === 1 || truc === 2) q = q.eq("truc", truc);
  const { data, error } = await q;
  if (error) {
    console.error("[shop] listNhom", error);
    throw new Error("LIST_NHOM_FAILED");
  }
  return ((data ?? []) as NhomRow[]).map(mapNhom);
}

/**
 * Tìm hoặc tạo nhóm theo nhãn. Trả null nếu nhãn trống (gỡ phân loại).
 */
export async function ensureNhom(
  ownerId: string,
  truc: ShopNhomTruc,
  nhanRaw: string | null | undefined,
): Promise<ShopNhom | null> {
  const nhan = nhanRaw == null ? null : normalizeNhan(nhanRaw);
  if (!nhan) return null;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("shop_nhom")
    .select("id, id_nguoi_dung, truc, nhan, mo_ta, thu_tu, tao_luc")
    .eq("id_nguoi_dung", ownerId)
    .eq("truc", truc)
    .eq("nhan", nhan)
    .eq("da_xoa", false)
    .maybeSingle<NhomRow>();
  if (existing) return mapNhom(existing);

  const { data: created, error } = await admin
    .from("shop_nhom")
    .insert({
      id_nguoi_dung: ownerId,
      truc,
      nhan,
    })
    .select("id, id_nguoi_dung, truc, nhan, mo_ta, thu_tu, tao_luc")
    .single<NhomRow>();
  if (error || !created) {
    // Race: unique conflict → đọc lại
    const { data: again } = await admin
      .from("shop_nhom")
      .select("id, id_nguoi_dung, truc, nhan, mo_ta, thu_tu, tao_luc")
      .eq("id_nguoi_dung", ownerId)
      .eq("truc", truc)
      .eq("nhan", nhan)
      .eq("da_xoa", false)
      .maybeSingle<NhomRow>();
    if (again) return mapNhom(again);
    console.error("[shop] ensureNhom", error);
    throw new Error("ENSURE_NHOM_FAILED");
  }
  return mapNhom(created);
}

/** Tạo loại hàng mới (hoặc lấy sẵn nếu trùng tên); gắn mô tả nếu truyền. */
export async function createNhom(
  ownerId: string,
  input: {
    truc: ShopNhomTruc;
    nhan: string;
    moTa?: string | null;
  },
): Promise<ShopNhom> {
  await assertBanHangEnabled(ownerId);
  const nhan = normalizeNhan(input.nhan);
  if (!nhan) throw new Error("NHAN_REQUIRED");

  const existing = await ensureNhom(ownerId, input.truc, nhan);
  if (!existing) throw new Error("NHAN_REQUIRED");

  if (input.moTa === undefined) return existing;
  const moTa = normalizeMoTa(input.moTa);
  if ((existing.moTa ?? null) === moTa) return existing;
  return updateNhom(ownerId, existing.id, { moTa });
}

export async function updateNhom(
  ownerId: string,
  nhomId: string,
  input: { moTa?: string | null; nhan?: string },
): Promise<ShopNhom> {
  await assertBanHangEnabled(ownerId);
  const admin = createServiceRoleClient();

  const { data: row, error: findErr } = await admin
    .from("shop_nhom")
    .select("id, id_nguoi_dung, truc, nhan, mo_ta, thu_tu, tao_luc")
    .eq("id", nhomId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle<NhomRow>();
  if (findErr || !row) throw new Error("NHOM_NOT_FOUND");

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  let nextNhan = row.nhan;

  if (input.moTa !== undefined) {
    patch.mo_ta = normalizeMoTa(input.moTa);
  }
  if (typeof input.nhan === "string") {
    const n = normalizeNhan(input.nhan);
    if (!n) throw new Error("NHAN_REQUIRED");
    if (n !== row.nhan) {
      patch.nhan = n;
      nextNhan = n;
    }
  }

  const { data: updated, error } = await admin
    .from("shop_nhom")
    .update(patch)
    .eq("id", nhomId)
    .eq("id_nguoi_dung", ownerId)
    .select("id, id_nguoi_dung, truc, nhan, mo_ta, thu_tu, tao_luc")
    .single<NhomRow>();
  if (error || !updated) {
    console.error("[shop] updateNhom", error);
    if (error?.code === "23505") throw new Error("NHAN_DUP");
    throw new Error("UPDATE_NHOM_FAILED");
  }

  // Đồng bộ denormalized text trên sản phẩm khi đổi nhãn
  if (nextNhan !== row.nhan) {
    const truc = row.truc === 2 ? 2 : 1;
    if (truc === 1) {
      await admin
        .from("shop_san_pham")
        .update({
          phan_loai: nextNhan,
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id_nguoi_dung", ownerId)
        .eq("id_nhom", nhomId)
        .eq("da_xoa", false);
    } else {
      await admin
        .from("shop_san_pham")
        .update({
          phan_loai_2: nextNhan,
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id_nguoi_dung", ownerId)
        .eq("id_nhom_2", nhomId)
        .eq("da_xoa", false);
    }
  }

  return mapNhom(updated);
}

/** Resolve nhãn → cột FK + text denormalized trên shop_san_pham. */
export async function resolvePhanLoaiPatch(
  ownerId: string,
  input: { phanLoai?: string | null; phanLoai2?: string | null },
): Promise<Record<string, string | null>> {
  const patch: Record<string, string | null> = {};
  if (input.phanLoai !== undefined) {
    const n = await ensureNhom(ownerId, 1, input.phanLoai);
    patch.id_nhom = n?.id ?? null;
    patch.phan_loai = n?.nhan ?? null;
  }
  if (input.phanLoai2 !== undefined) {
    const n = await ensureNhom(ownerId, 2, input.phanLoai2);
    patch.id_nhom_2 = n?.id ?? null;
    patch.phan_loai_2 = n?.nhan ?? null;
  }
  return patch;
}
