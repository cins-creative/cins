import "server-only";

import {
  buildBunnyEmbedUrl,
  buildBunnyVideoThumbnailUrl,
} from "@/lib/bunny/embed";
import { assertBanHangEnabled, shopImageUrl } from "@/lib/shop/settings";
import type { ShopNhom, ShopNhomTruc } from "@/lib/shop/types";
import { SHOP_NHOM_ANH_PHU_MAX, SHOP_NHOM_MO_TA_MAX } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const SHOP_NHOM_NHAN_MAX = 40;

const NHOM_SELECT =
  "id, id_nguoi_dung, truc, nhan, mo_ta, anh_id, overlay_anh_id, anh_phu_ids, video_phu_id, gia_mac_dinh, thu_tu, tao_luc";

type NhomRow = {
  id: string;
  id_nguoi_dung: string;
  truc: number;
  nhan: string;
  mo_ta: string | null;
  anh_id: string | null;
  overlay_anh_id: string | null;
  anh_phu_ids: string[] | null;
  video_phu_id: string | null;
  gia_mac_dinh: number | string | null;
  thu_tu: number;
  tao_luc: string;
};

function normalizeAnhPhuIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, SHOP_NHOM_ANH_PHU_MAX);
}

function normalizeVideoPhuId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  return t || null;
}

function shopVideoUrls(videoId: string | null): {
  videoPhuId: string | null;
  videoPhuEmbedUrl: string | null;
  videoPhuThumbUrl: string | null;
} {
  const id = videoId?.trim() || null;
  if (!id) {
    return {
      videoPhuId: null,
      videoPhuEmbedUrl: null,
      videoPhuThumbUrl: null,
    };
  }
  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID?.trim();
  return {
    videoPhuId: id,
    videoPhuEmbedUrl: libraryId ? buildBunnyEmbedUrl(libraryId, id) : null,
    videoPhuThumbUrl: buildBunnyVideoThumbnailUrl(id),
  };
}

function mapNhom(row: NhomRow): ShopNhom {
  const gia =
    row.gia_mac_dinh == null || row.gia_mac_dinh === ""
      ? null
      : Number(row.gia_mac_dinh);
  const anhPhuIds = normalizeAnhPhuIds(row.anh_phu_ids);
  const video = shopVideoUrls(row.video_phu_id);
  return {
    id: row.id,
    truc: row.truc === 2 ? 2 : 1,
    nhan: row.nhan,
    moTa: row.mo_ta?.trim() || null,
    anhId: row.anh_id?.trim() || null,
    anhUrl: shopImageUrl(row.anh_id),
    overlayAnhId: row.overlay_anh_id?.trim() || null,
    overlayAnhUrl: shopImageUrl(row.overlay_anh_id),
    anhPhuIds,
    anhPhuUrls: anhPhuIds
      .map((id) => shopImageUrl(id))
      .filter((url): url is string => Boolean(url)),
    ...video,
    giaMacDinh:
      gia != null && Number.isFinite(gia) && gia >= 0 ? gia : null,
    thuTu: row.thu_tu,
    taoLuc: row.tao_luc,
  };
}

function normalizeGiaMacDinh(
  raw: number | null | undefined,
): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error("GIA_INVALID");
  return n;
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
    .select(NHOM_SELECT)
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

export async function getNhomById(
  nhomId: string,
): Promise<(ShopNhom & { idNguoiDung: string }) | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_nhom")
    .select(NHOM_SELECT)
    .eq("id", nhomId)
    .eq("da_xoa", false)
    .maybeSingle<NhomRow>();
  if (error) {
    console.error("[shop] getNhomById", error);
    throw new Error("LOAD_NHOM_FAILED");
  }
  if (!data) return null;
  return { ...mapNhom(data), idNguoiDung: data.id_nguoi_dung };
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
    .select(NHOM_SELECT)
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
    .select(NHOM_SELECT)
    .single<NhomRow>();
  if (error || !created) {
    const { data: again } = await admin
      .from("shop_nhom")
      .select(NHOM_SELECT)
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

/**
 * Đồng bộ `gia_mac_dinh` xuống mọi `shop_bang_gia_dong.gia` của mẫu thuộc loại.
 * Giữ nguyên `gia_giam` từng dòng. Không có bảng giá → tạo «Bảng giá mặc định».
 */
export async function syncNhomGiaMacDinhToMau(
  ownerId: string,
  nhomId: string,
  giaMacDinh: number | null,
): Promise<void> {
  if (giaMacDinh == null) return;
  const admin = createServiceRoleClient();

  const { data: spRows } = await admin
    .from("shop_san_pham")
    .select("id")
    .eq("id_nguoi_dung", ownerId)
    .eq("id_nhom", nhomId)
    .eq("da_xoa", false);
  const spIds = ((spRows ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (spIds.length === 0) return;

  const { data: btRows } = await admin
    .from("shop_bien_the")
    .select("id")
    .in("id_san_pham", spIds)
    .eq("da_xoa", false);
  const btIds = ((btRows ?? []) as Array<{ id: string }>).map((b) => b.id);
  if (btIds.length === 0) return;

  let { data: bgRows } = await admin
    .from("shop_bang_gia")
    .select("id")
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(20);
  let bangIds = ((bgRows ?? []) as Array<{ id: string }>).map((b) => b.id);

  if (bangIds.length === 0) {
    const { data: created, error } = await admin
      .from("shop_bang_gia")
      .insert({
        id_nguoi_dung: ownerId,
        ten: "Bảng giá mặc định",
        tien_te: "VND",
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !created) {
      console.error("[shop] syncNhomGia create bang_gia", error);
      throw new Error("SYNC_GIA_FAILED");
    }
    bangIds = [created.id];
  }

  const primaryBang = bangIds[0]!;
  const { data: existingDong } = await admin
    .from("shop_bang_gia_dong")
    .select("id, id_bang_gia, id_bien_the, gia_giam")
    .in("id_bang_gia", bangIds)
    .in("id_bien_the", btIds);

  const dongByBt = new Map<
    string,
    { id: string; id_bang_gia: string; gia_giam: number | string | null }
  >();
  for (const d of (existingDong ?? []) as Array<{
    id: string;
    id_bang_gia: string;
    id_bien_the: string;
    gia_giam: number | string | null;
  }>) {
    if (!dongByBt.has(d.id_bien_the)) dongByBt.set(d.id_bien_the, d);
  }

  const toUpdate = [...dongByBt.values()];
  if (toUpdate.length > 0) {
    for (const d of toUpdate) {
      const { error } = await admin
        .from("shop_bang_gia_dong")
        .update({ gia: giaMacDinh })
        .eq("id", d.id);
      if (error) {
        console.error("[shop] syncNhomGia update dong", error);
        throw new Error("SYNC_GIA_FAILED");
      }
    }
  }

  const missing = btIds.filter((id) => !dongByBt.has(id));
  if (missing.length > 0) {
    const { error } = await admin.from("shop_bang_gia_dong").insert(
      missing.map((idBienThe) => ({
        id_bang_gia: primaryBang,
        id_bien_the: idBienThe,
        gia: giaMacDinh,
        gia_giam: null,
      })),
    );
    if (error) {
      console.error("[shop] syncNhomGia insert dong", error);
      throw new Error("SYNC_GIA_FAILED");
    }
  }
}

/** Tạo loại hàng mới (hoặc lấy sẵn nếu trùng tên); gắn mô tả / ảnh / giá nếu truyền. */
export async function createNhom(
  ownerId: string,
  input: {
    truc: ShopNhomTruc;
    nhan: string;
    moTa?: string | null;
    anhId?: string | null;
    giaMacDinh?: number | null;
  },
): Promise<ShopNhom> {
  await assertBanHangEnabled(ownerId);
  const nhan = normalizeNhan(input.nhan);
  if (!nhan) throw new Error("NHAN_REQUIRED");

  const existing = await ensureNhom(ownerId, input.truc, nhan);
  if (!existing) throw new Error("NHAN_REQUIRED");

  if (
    input.moTa === undefined &&
    input.anhId === undefined &&
    input.giaMacDinh === undefined
  ) {
    return existing;
  }
  return updateNhom(ownerId, existing.id, {
    moTa: input.moTa,
    anhId: input.anhId,
    giaMacDinh: input.giaMacDinh,
  });
}

export async function updateNhom(
  ownerId: string,
  nhomId: string,
  input: {
    moTa?: string | null;
    nhan?: string;
    anhId?: string | null;
    overlayAnhId?: string | null;
    anhPhuIds?: string[];
    videoPhuId?: string | null;
    giaMacDinh?: number | null;
  },
): Promise<ShopNhom> {
  await assertBanHangEnabled(ownerId);
  const admin = createServiceRoleClient();

  const { data: row, error: findErr } = await admin
    .from("shop_nhom")
    .select(NHOM_SELECT)
    .eq("id", nhomId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle<NhomRow>();
  if (findErr || !row) throw new Error("NHOM_NOT_FOUND");

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  let nextNhan = row.nhan;
  let giaChanged = false;
  let nextGia: number | null | undefined;

  if (input.moTa !== undefined) {
    patch.mo_ta = normalizeMoTa(input.moTa);
  }
  if (input.anhId !== undefined) {
    patch.anh_id = input.anhId?.trim() || null;
  }
  if (input.overlayAnhId !== undefined) {
    patch.overlay_anh_id = input.overlayAnhId?.trim() || null;
  }
  if (input.anhPhuIds !== undefined) {
    patch.anh_phu_ids = normalizeAnhPhuIds(input.anhPhuIds);
  }
  if (input.videoPhuId !== undefined) {
    patch.video_phu_id = normalizeVideoPhuId(input.videoPhuId);
  }
  if (input.giaMacDinh !== undefined) {
    nextGia = normalizeGiaMacDinh(input.giaMacDinh);
    patch.gia_mac_dinh = nextGia;
    const prev =
      row.gia_mac_dinh == null ? null : Number(row.gia_mac_dinh);
    giaChanged = (prev ?? null) !== (nextGia ?? null);
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
    .select(NHOM_SELECT)
    .single<NhomRow>();
  if (error || !updated) {
    console.error("[shop] updateNhom", error);
    if (error?.code === "23505") throw new Error("NHAN_DUP");
    throw new Error("UPDATE_NHOM_FAILED");
  }

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

  if (giaChanged && nextGia !== undefined && row.truc === 1) {
    await syncNhomGiaMacDinhToMau(ownerId, nhomId, nextGia);
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
