import "server-only";

import {
  normalizeTaxonomyKeyword,
  type ShopDanhMuc,
} from "@/lib/shop/danh-muc";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AdminShopDanhMucRow = ShopDanhMuc & {
  soNhom: number;
};

type DanhMucRow = {
  id: string;
  slug: string;
  ten: string;
  id_cha: string | null;
  nganh_hang: string;
  mo_ta: string | null;
  thu_tu: number;
  icon: string | null;
  trang_thai: string;
};

function mapRow(row: DanhMucRow, soNhom = 0): AdminShopDanhMucRow {
  return {
    id: row.id,
    slug: row.slug,
    ten: row.ten,
    idCha: row.id_cha,
    nganhHang: row.nganh_hang,
    moTa: row.mo_ta?.trim() || null,
    thuTu: row.thu_tu,
    icon: row.icon?.trim() || null,
    trangThai: row.trang_thai === "an" ? "an" : "hien",
    soNhom,
  };
}

/** Slug ổn định từ tên (ASCII, gạch nối). */
export function slugifyDanhMucTen(ten: string): string {
  const base = normalizeTaxonomyKeyword(ten).replace(/\s+/g, "-").slice(0, 64);
  return base || "danh-muc";
}

export async function listShopDanhMucForAdmin(opts?: {
  nganhHang?: string;
}): Promise<AdminShopDanhMucRow[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_danh_muc")
    .select(
      "id, slug, ten, id_cha, nganh_hang, mo_ta, thu_tu, icon, trang_thai",
    )
    .order("thu_tu", { ascending: true })
    .order("ten", { ascending: true })
    .limit(500);

  if (opts?.nganhHang) q = q.eq("nganh_hang", opts.nganhHang);

  const { data, error } = await q.returns<DanhMucRow[]>();
  if (error) {
    console.error("[admin] listShopDanhMucForAdmin", error);
    throw new Error("Không tải được danh mục hàng.");
  }

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: nhomRows, error: nhomErr } = await admin
    .from("shop_nhom")
    .select("id_danh_muc")
    .in("id_danh_muc", ids)
    .eq("da_xoa", false)
    .limit(8000)
    .returns<Array<{ id_danh_muc: string | null }>>();
  if (nhomErr) {
    console.error("[admin] listShopDanhMucForAdmin nhom count", nhomErr);
  }

  const countById = new Map<string, number>();
  for (const r of nhomRows ?? []) {
    const id = r.id_danh_muc?.trim();
    if (!id) continue;
    countById.set(id, (countById.get(id) ?? 0) + 1);
  }

  return rows.map((r) => mapRow(r, countById.get(r.id) ?? 0));
}

export type CreateShopDanhMucInput = {
  ten: string;
  slug?: string;
  moTa?: string | null;
  thuTu?: number;
  nganhHang?: string;
  trangThai?: "hien" | "an";
  idCha?: string | null;
};

export async function createShopDanhMuc(
  input: CreateShopDanhMucInput,
): Promise<AdminShopDanhMucRow> {
  const ten = input.ten.trim();
  if (!ten || ten.length > 80) {
    throw new Error("Tên danh mục 1–80 ký tự.");
  }

  let slug = (input.slug?.trim() || slugifyDanhMucTen(ten)).slice(0, 64);
  if (!slug) throw new Error("Slug không hợp lệ.");

  const admin = createServiceRoleClient();
  const nganhHang = (input.nganhHang?.trim() || "merch").slice(0, 40);
  const trangThai = input.trangThai === "an" ? "an" : "hien";
  const thuTu =
    typeof input.thuTu === "number" && Number.isFinite(input.thuTu)
      ? Math.trunc(input.thuTu)
      : 100;
  const moTa = input.moTa?.trim() || null;
  const idCha: string | null = input.idCha?.trim() || null;
  if (idCha) {
    await assertAssignableIdCha(admin, { idCha });
  }

  // Tránh đụng unique slug: thử vài hậu tố.
  for (let i = 0; i < 8; i++) {
    const trySlug = i === 0 ? slug : `${slug.slice(0, 60)}-${i + 1}`;
    const { data, error } = await admin
      .from("shop_danh_muc")
      .insert({
        ten,
        slug: trySlug,
        nganh_hang: nganhHang,
        mo_ta: moTa,
        thu_tu: thuTu,
        trang_thai: trangThai,
        id_cha: idCha,
      })
      .select(
        "id, slug, ten, id_cha, nganh_hang, mo_ta, thu_tu, icon, trang_thai",
      )
      .maybeSingle<DanhMucRow>();

    if (!error && data) return mapRow(data, 0);

    const msg = error?.message ?? "";
    if (msg.includes("uq_shop_danh_muc_slug") || msg.includes("duplicate")) {
      continue;
    }
    console.error("[admin] createShopDanhMuc", error);
    throw new Error("Không tạo được danh mục.");
  }

  throw new Error("Slug đã tồn tại — đổi slug rồi thử lại.");
}

async function assertAssignableIdCha(
  admin: ReturnType<typeof createServiceRoleClient>,
  opts: { idCha: string; selfId?: string },
): Promise<void> {
  if (opts.selfId && opts.idCha === opts.selfId) {
    throw new Error("Không đặt danh mục làm cha của chính nó.");
  }
  const { data: cha } = await admin
    .from("shop_danh_muc")
    .select("id, id_cha")
    .eq("id", opts.idCha)
    .maybeSingle<{ id: string; id_cha: string | null }>();
  if (!cha) throw new Error("Cấp cha không tồn tại.");
  if (cha.id_cha) {
    throw new Error("Cây chỉ hai tầng — chọn cấp cha gốc, không gắn vào lá.");
  }
  if (opts.selfId) {
    const { data: ownChild } = await admin
      .from("shop_danh_muc")
      .select("id")
      .eq("id_cha", opts.selfId)
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (ownChild) {
      throw new Error("Cấp cha không nằm dưới cấp cha khác.");
    }
  }
  const { data: child } = await admin
    .from("shop_danh_muc")
    .select("id")
    .eq("id_cha", opts.idCha)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!child) {
    const { count } = await admin
      .from("shop_nhom")
      .select("id", { count: "exact", head: true })
      .eq("id_danh_muc", opts.idCha)
      .eq("da_xoa", false);
    if ((count ?? 0) > 0) {
      throw new Error(
        "Không dùng lá đang có loại làm cấp cha — chọn nhóm phụ hoặc tạo cấp cha mới.",
      );
    }
  }
}

export type PatchShopDanhMucInput = {
  ten?: string;
  slug?: string;
  moTa?: string | null;
  thuTu?: number;
  trangThai?: "hien" | "an";
  idCha?: string | null;
};

export async function patchShopDanhMuc(
  id: string,
  input: PatchShopDanhMucInput,
): Promise<AdminShopDanhMucRow> {
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };

  if (typeof input.ten === "string") {
    const ten = input.ten.trim();
    if (!ten || ten.length > 80) throw new Error("Tên danh mục 1–80 ký tự.");
    patch.ten = ten;
  }
  if (typeof input.slug === "string") {
    const slug = input.slug.trim().slice(0, 64);
    if (!slug) throw new Error("Slug không hợp lệ.");
    patch.slug = slug;
  }
  if (input.moTa !== undefined) {
    patch.mo_ta = input.moTa?.trim() || null;
  }
  if (typeof input.thuTu === "number" && Number.isFinite(input.thuTu)) {
    patch.thu_tu = Math.trunc(input.thuTu);
  }
  if (input.trangThai === "hien" || input.trangThai === "an") {
    patch.trang_thai = input.trangThai;
  }

  const admin = createServiceRoleClient();
  if (input.idCha !== undefined) {
    const idCha = input.idCha?.trim() || null;
    if (idCha) {
      await assertAssignableIdCha(admin, { idCha, selfId: id });
    }
    patch.id_cha = idCha;
  }

  if (Object.keys(patch).length <= 1) {
    throw new Error("Không có trường để cập nhật.");
  }

  const { data, error } = await admin
    .from("shop_danh_muc")
    .update(patch)
    .eq("id", id)
    .select(
      "id, slug, ten, id_cha, nganh_hang, mo_ta, thu_tu, icon, trang_thai",
    )
    .maybeSingle<DanhMucRow>();

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("uq_shop_danh_muc_slug") || msg.includes("duplicate")) {
      throw new Error("Slug đã tồn tại.");
    }
    console.error("[admin] patchShopDanhMuc", error);
    throw new Error("Không cập nhật được danh mục.");
  }
  if (!data) throw new Error("Không tìm thấy danh mục.");

  const { count } = await admin
    .from("shop_nhom")
    .select("id", { count: "exact", head: true })
    .eq("id_danh_muc", id)
    .eq("da_xoa", false);

  return mapRow(data, count ?? 0);
}

export async function deleteShopDanhMuc(id: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("shop_danh_muc")
    .select("id")
    .eq("id", id)
    .maybeSingle<{ id: string }>();
  if (!row) throw new Error("Không tìm thấy danh mục.");

  const { data: child } = await admin
    .from("shop_danh_muc")
    .select("id")
    .eq("id_cha", id)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (child) {
    throw new Error("Còn lá con — chuyển hoặc xóa lá trước.");
  }

  const { error } = await admin.from("shop_danh_muc").delete().eq("id", id);
  if (error) {
    console.error("[admin] deleteShopDanhMuc", error);
    throw new Error("Không xóa được danh mục.");
  }
}
