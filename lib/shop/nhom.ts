import "server-only";

import {
  buildBunnyEmbedUrl,
  buildBunnyVideoThumbnailUrl,
} from "@/lib/bunny/embed";
import { getOrCreateDefaultBangGia } from "@/lib/shop/bang-gia";
import { assertBanHangEnabled, shopImageUrl } from "@/lib/shop/settings";
import type { ShopNhom, ShopNhomTruc } from "@/lib/shop/types";
import {
  SHOP_NHOM_ANH_PHU_MAX,
  SHOP_NHOM_FEATURE_MAX,
  SHOP_NHOM_MO_TA_MAX,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const SHOP_NHOM_NHAN_MAX = 40;

const NHOM_COLS_BASE =
  "id, id_nguoi_dung, truc, nhan, mo_ta, anh_id, overlay_anh_id, anh_phu_ids, video_phu_id, gia_mac_dinh, noi_bat, thu_tu, tao_luc";
const NHOM_COLS_SO_MAU = `${NHOM_COLS_BASE}, so_mau`;

/**
 * `so_mau` là cột cache tuỳ chọn (migration_shop_nhom_so_mau.sql). Nếu DB chưa
 * áp migration, PostgREST trả 42703 → tự hạ cấp bỏ `so_mau` (soMau hiển thị 0)
 * để không sập cả danh sách loại. Môi trường đã áp migration vẫn lấy số thật.
 */
let soMauSupported = true;
function nhomCols(): string {
  return soMauSupported ? NHOM_COLS_SO_MAU : NHOM_COLS_BASE;
}
function isMissingSoMauErr(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  return error.code === "42703" || /so_mau/i.test(error.message ?? "");
}

type PgErrLike = { code?: string; message?: string } | null;

/**
 * Mọi truy vấn `shop_nhom` phải đi qua đây. `soMauSupported` là state cấp module
 * nên mỗi isolate (Cloudflare Workers) khởi động lại với giá trị `true`; nếu chỉ
 * `listNhom` biết hạ cấp thì một request ghi đến isolate "lạnh" sẽ chết ngay ở
 * lần select đầu. PostgREST fail 42703 lúc plan nên INSERT/UPDATE chưa chạy —
 * gọi lại với bộ cột đã hạ cấp là an toàn, không ghi hai lần.
 */
async function withNhomCols(
  run: (cols: string) => PromiseLike<{ data: unknown; error: PgErrLike }>,
): Promise<{ data: unknown; error: PgErrLike }> {
  const first = await run(nhomCols());
  if (first.error && soMauSupported && isMissingSoMauErr(first.error)) {
    soMauSupported = false;
    return run(nhomCols());
  }
  return first;
}

/**
 * Đếm số mẫu (`shop_san_pham.da_xoa=false`) cho mỗi loại từ `id_nhom` +
 * `id_nhom_2` khi DB chưa có cột cache `so_mau`. Gán trực tiếp vào `soMau`.
 */
async function fillSoMauFromProducts(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerId: string,
  nhoms: ShopNhom[],
): Promise<void> {
  if (nhoms.length === 0) return;
  const { data } = await admin
    .from("shop_san_pham")
    .select("id_nhom, id_nhom_2")
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .limit(10000);
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as Array<{
    id_nhom: string | null;
    id_nhom_2: string | null;
  }>) {
    if (r.id_nhom) counts.set(r.id_nhom, (counts.get(r.id_nhom) ?? 0) + 1);
    if (r.id_nhom_2) {
      counts.set(r.id_nhom_2, (counts.get(r.id_nhom_2) ?? 0) + 1);
    }
  }
  for (const n of nhoms) n.soMau = counts.get(n.id) ?? 0;
}

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
  noi_bat: boolean;
  so_mau?: number | null;
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
    noiBat: row.noi_bat === true,
    soMau: Number.isFinite(Number(row.so_mau)) ? Number(row.so_mau) : 0,
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
  const { data, error } = await withNhomCols((cols) => {
    let q = admin
      .from("shop_nhom")
      .select(cols)
      .eq("id_nguoi_dung", ownerId)
      .eq("da_xoa", false)
      .order("noi_bat", { ascending: false })
      .order("thu_tu", { ascending: true })
      .order("nhan", { ascending: true })
      .limit(200);
    if (truc === 1 || truc === 2) q = q.eq("truc", truc);
    return q;
  });
  if (error) {
    console.error("[shop] listNhom", error);
    throw new Error("LIST_NHOM_FAILED");
  }
  const nhoms = ((data ?? []) as unknown as NhomRow[]).map(mapNhom);
  // Thiếu cột cache `so_mau` → đếm trực tiếp từ shop_san_pham để không hiện 0.
  if (!soMauSupported) await fillSoMauFromProducts(admin, ownerId, nhoms);
  return nhoms;
}

export async function getNhomById(
  nhomId: string,
): Promise<(ShopNhom & { idNguoiDung: string }) | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await withNhomCols((cols) =>
    admin
      .from("shop_nhom")
      .select(cols)
      .eq("id", nhomId)
      .eq("da_xoa", false)
      .maybeSingle<NhomRow>(),
  );
  if (error) {
    console.error("[shop] getNhomById", error);
    throw new Error("LOAD_NHOM_FAILED");
  }
  const row = data as NhomRow | null;
  if (!row) return null;
  return { ...mapNhom(row), idNguoiDung: row.id_nguoi_dung };
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
  const findByNhan = () =>
    withNhomCols((cols) =>
      admin
        .from("shop_nhom")
        .select(cols)
        .eq("id_nguoi_dung", ownerId)
        .eq("truc", truc)
        .eq("nhan", nhan)
        .eq("da_xoa", false)
        .maybeSingle<NhomRow>(),
    );

  const { data: existing } = await findByNhan();
  if (existing) return mapNhom(existing as NhomRow);

  const { data: created, error } = await withNhomCols((cols) =>
    admin
      .from("shop_nhom")
      .insert({
        id_nguoi_dung: ownerId,
        truc,
        nhan,
      })
      .select(cols)
      .single<NhomRow>(),
  );
  if (error || !created) {
    const { data: again } = await findByNhan();
    if (again) return mapNhom(again as NhomRow);
    console.error("[shop] ensureNhom", error);
    throw new Error("ENSURE_NHOM_FAILED");
  }
  return mapNhom(created as NhomRow);
}

/**
 * Đồng bộ `gia_mac_dinh` xuống mọi `shop_bang_gia_dong.gia` của mẫu thuộc loại.
 * Giữ nguyên `gia_giam` từng dòng. Không có bảng giá → tạo «Bảng giá mặc định».
 * Trả về số biến thể đã ghi giá (update + insert) — dùng cho toast «Áp dụng».
 */
export async function syncNhomGiaMacDinhToMau(
  ownerId: string,
  nhomId: string,
  giaMacDinh: number | null,
): Promise<number> {
  if (giaMacDinh == null) return 0;
  const admin = createServiceRoleClient();

  // Tên loại — để bắt thêm sản phẩm chỉ khớp theo `phan_loai` text (FK `id_nhom`
  // còn null), tránh sót biến thể như trước.
  const { data: nhomRow } = await admin
    .from("shop_nhom")
    .select("nhan")
    .eq("id", nhomId)
    .maybeSingle<{ nhan: string | null }>();
  const nhan = nhomRow?.nhan?.trim() ?? "";

  const spIdSet = new Set<string>();
  {
    const { data: byFk } = await admin
      .from("shop_san_pham")
      .select("id")
      .eq("id_nguoi_dung", ownerId)
      .eq("id_nhom", nhomId)
      .eq("da_xoa", false);
    for (const s of (byFk ?? []) as Array<{ id: string }>) spIdSet.add(s.id);
    if (nhan) {
      const { data: byText } = await admin
        .from("shop_san_pham")
        .select("id")
        .eq("id_nguoi_dung", ownerId)
        .eq("phan_loai", nhan)
        .eq("da_xoa", false);
      for (const s of (byText ?? []) as Array<{ id: string }>) spIdSet.add(s.id);
    }
  }
  const spIds = [...spIdSet];
  if (spIds.length === 0) return 0;

  const { data: btRows } = await admin
    .from("shop_bien_the")
    .select("id")
    .in("id_san_pham", spIds)
    .eq("da_xoa", false);
  const btIds = ((btRows ?? []) as Array<{ id: string }>).map((b) => b.id);
  if (btIds.length === 0) return 0;

  // Mô hình 1 bảng giá VND duy nhất — ghi vào đúng bảng canonical.
  const { id: bangId } = await getOrCreateDefaultBangGia(ownerId);

  const { data: existingDong } = await admin
    .from("shop_bang_gia_dong")
    .select("id, id_bien_the")
    .eq("id_bang_gia", bangId)
    .in("id_bien_the", btIds);

  const dongIdByBt = new Map<string, string>();
  for (const d of (existingDong ?? []) as Array<{
    id: string;
    id_bien_the: string;
  }>) {
    if (!dongIdByBt.has(d.id_bien_the)) dongIdByBt.set(d.id_bien_the, d.id);
  }

  for (const dongId of dongIdByBt.values()) {
    const { error } = await admin
      .from("shop_bang_gia_dong")
      .update({ gia: giaMacDinh })
      .eq("id", dongId);
    if (error) {
      console.error("[shop] syncNhomGia update dong", error);
      throw new Error("SYNC_GIA_FAILED");
    }
  }

  const missing = btIds.filter((id) => !dongIdByBt.has(id));
  if (missing.length > 0) {
    const { error } = await admin.from("shop_bang_gia_dong").insert(
      missing.map((idBienThe) => ({
        id_bang_gia: bangId,
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

  return btIds.length;
}

/**
 * «Áp dụng giá gốc»: ghi `shop_nhom.gia_mac_dinh` xuống dòng giá của mọi biến
 * thể trong loại theo yêu cầu chủ shop (không phụ thuộc giá có đổi hay không —
 * khác nhánh auto-sync trong `updateNhom` chỉ chạy khi `giaChanged`). Nhờ đó
 * biến thể thêm sau này cũng có dòng `shop_bang_gia_dong`, hết cảnh giỏ báo
 * "Mặt hàng đã ngừng bán." vì thiếu dòng giá sống.
 */
export async function applyNhomGiaMacDinh(
  ownerId: string,
  nhomId: string,
): Promise<{ count: number; giaMacDinh: number }> {
  await assertBanHangEnabled(ownerId);
  const nhom = await getNhomById(nhomId);
  if (!nhom || nhom.idNguoiDung !== ownerId) {
    throw new Error("NHOM_NOT_FOUND");
  }
  if (nhom.truc !== 1) throw new Error("GIA_TRUC");
  if (nhom.giaMacDinh == null) throw new Error("GIA_MAC_DINH_MISSING");
  const count = await syncNhomGiaMacDinhToMau(ownerId, nhomId, nhom.giaMacDinh);
  return { count, giaMacDinh: nhom.giaMacDinh };
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
    noiBat?: boolean;
  },
): Promise<ShopNhom> {
  await assertBanHangEnabled(ownerId);
  const admin = createServiceRoleClient();

  const { data: found, error: findErr } = await withNhomCols((cols) =>
    admin
      .from("shop_nhom")
      .select(cols)
      .eq("id", nhomId)
      .eq("id_nguoi_dung", ownerId)
      .eq("da_xoa", false)
      .maybeSingle<NhomRow>(),
  );
  const row = found as NhomRow | null;
  if (findErr || !row) throw new Error("NHOM_NOT_FOUND");

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  let nextNhan = row.nhan;

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
    /*
     * Chỉ lưu giá gốc cấp loại. KHÔNG tự ghi xuống `shop_bang_gia_dong` của
     * biến thể ở đây — việc đó chỉ chạy khi chủ shop bấm «Áp dụng»
     * (`applyNhomGiaMacDinh`). Nhờ vậy sửa giá gốc mà chưa Áp dụng thì mẫu +
     * bảng kho không đổi theo.
     */
    patch.gia_mac_dinh = normalizeGiaMacDinh(input.giaMacDinh);
  }
  if (typeof input.nhan === "string") {
    const n = normalizeNhan(input.nhan);
    if (!n) throw new Error("NHAN_REQUIRED");
    if (n !== row.nhan) {
      patch.nhan = n;
      nextNhan = n;
    }
  }
  if (typeof input.noiBat === "boolean") {
    if (input.noiBat === true) {
      const truc = row.truc === 2 ? 2 : 1;
      if (truc !== 1) throw new Error("FEATURE_TRUC");
      const { count: featuredCount, error: featErr } = await admin
        .from("shop_nhom")
        .select("id", { count: "exact", head: true })
        .eq("id_nguoi_dung", ownerId)
        .eq("da_xoa", false)
        .eq("truc", 1)
        .eq("noi_bat", true)
        .neq("id", nhomId);
      if (featErr) {
        console.error("[shop] updateNhom feature count", featErr);
        throw new Error("UPDATE_NHOM_FAILED");
      }
      if ((featuredCount ?? 0) >= SHOP_NHOM_FEATURE_MAX) {
        throw new Error("FEATURE_LIMIT");
      }
    }
    patch.noi_bat = input.noiBat;
  }

  const { data: updated, error } = await withNhomCols((cols) =>
    admin
      .from("shop_nhom")
      .update(patch)
      .eq("id", nhomId)
      .eq("id_nguoi_dung", ownerId)
      .select(cols)
      .single<NhomRow>(),
  );
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

  return mapNhom(updated as NhomRow);
}

/**
 * Soft-delete loại hàng / thẻ phân loại.
 * Chỉ khi không còn `shop_san_pham` (da_xoa=false) gắn `id_nhom` / `id_nhom_2`.
 */
export async function softDeleteNhom(
  ownerId: string,
  nhomId: string,
): Promise<void> {
  await assertBanHangEnabled(ownerId);
  const admin = createServiceRoleClient();

  const { data: row, error: findErr } = await admin
    .from("shop_nhom")
    .select("id, truc")
    .eq("id", nhomId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string; truc: number }>();
  if (findErr || !row) throw new Error("NHOM_NOT_FOUND");

  const fkCol = row.truc === 2 ? "id_nhom_2" : "id_nhom";
  const { count, error: countErr } = await admin
    .from("shop_san_pham")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", ownerId)
    .eq(fkCol, nhomId)
    .eq("da_xoa", false);
  if (countErr) {
    console.error("[shop] softDeleteNhom count", countErr);
    throw new Error("DELETE_FAILED");
  }
  const remaining = count ?? 0;
  if (remaining > 0) {
    const err = new Error("NHOM_HAS_PRODUCTS");
    (err as Error & { count?: number }).count = remaining;
    throw err;
  }

  const { error, count: deleted } = await admin
    .from("shop_nhom")
    .update(
      { da_xoa: true, cap_nhat_luc: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", nhomId)
    .eq("id_nguoi_dung", ownerId)
    .eq("da_xoa", false);
  if (error) {
    console.error("[shop] softDeleteNhom", error);
    throw new Error("DELETE_FAILED");
  }
  /* Một số môi trường không trả count trên UPDATE — chỉ fail khi chắc chắn 0. */
  if (deleted === 0) {
    console.error("[shop] softDeleteNhom", "no rows updated");
    throw new Error("DELETE_FAILED");
  }
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
