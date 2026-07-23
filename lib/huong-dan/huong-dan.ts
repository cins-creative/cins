import "server-only";

import {
  isValidHuongDanSlug,
  slugifyHuongDan,
} from "@/lib/huong-dan/slug";
import type {
  CreateHuongDanNhomInput,
  HuongDanCatalogPublic,
  HuongDanNhomAdmin,
  HuongDanNhomPublic,
  HuongDanPhienAdmin,
  HuongDanPhienPublic,
  SaveHuongDanPhienInput,
} from "@/lib/huong-dan/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type {
  CreateHuongDanNhomInput,
  HuongDanCatalogPublic,
  HuongDanNhomAdmin,
  HuongDanNhomPublic,
  HuongDanPhienAdmin,
  HuongDanPhienPublic,
  SaveHuongDanPhienInput,
} from "@/lib/huong-dan/types";

const MAX_TITLE = 200;
const MAX_HTML = 200_000;
const MAX_URL = 2000;
const SELECT_COLS =
  "id, nhom_slug, nhom_ten, nhom_thu_tu, slug, tieu_de, video_url, noi_dung_html, thu_tu, da_xuat_ban, da_xoa, tao_luc, sua_luc";

type Row = {
  id: string;
  nhom_slug: string;
  nhom_ten: string;
  nhom_thu_tu: number;
  slug: string;
  tieu_de: string;
  video_url: string | null;
  noi_dung_html: string;
  thu_tu: number;
  da_xuat_ban: boolean;
  da_xoa: boolean;
  tao_luc: string;
  sua_luc: string;
};

function trimTo(value: string | null | undefined, max: number): string {
  return (value ?? "").toString().trim().slice(0, max);
}

function mapPhienPublic(row: Row): HuongDanPhienPublic {
  return {
    id: row.id,
    slug: row.slug,
    tieuDe: row.tieu_de,
    videoUrl: row.video_url,
    noiDungHtml: row.noi_dung_html ?? "",
    thuTu: row.thu_tu,
  };
}

function mapPhienAdmin(row: Row): HuongDanPhienAdmin {
  return {
    ...mapPhienPublic(row),
    nhomSlug: row.nhom_slug,
    nhomTen: row.nhom_ten,
    nhomThuTu: row.nhom_thu_tu,
    daXuatBan: row.da_xuat_ban,
    daXoa: row.da_xoa,
    taoLuc: row.tao_luc,
    suaLuc: row.sua_luc,
  };
}

function groupPublic(rows: Row[]): HuongDanNhomPublic[] {
  const map = new Map<string, HuongDanNhomPublic>();
  for (const row of rows) {
    let nhom = map.get(row.nhom_slug);
    if (!nhom) {
      nhom = {
        slug: row.nhom_slug,
        ten: row.nhom_ten,
        thuTu: row.nhom_thu_tu,
        phien: [],
      };
      map.set(row.nhom_slug, nhom);
    } else if (row.nhom_thu_tu < nhom.thuTu) {
      nhom.thuTu = row.nhom_thu_tu;
      nhom.ten = row.nhom_ten;
    }
    nhom.phien.push(mapPhienPublic(row));
  }
  return [...map.values()]
    .map((n) => ({
      ...n,
      phien: [...n.phien].sort((a, b) => a.thuTu - b.thuTu),
    }))
    .sort((a, b) => a.thuTu - b.thuTu || a.slug.localeCompare(b.slug));
}

function groupAdmin(rows: Row[]): HuongDanNhomAdmin[] {
  const map = new Map<string, HuongDanNhomAdmin>();
  for (const row of rows) {
    let nhom = map.get(row.nhom_slug);
    if (!nhom) {
      nhom = {
        slug: row.nhom_slug,
        ten: row.nhom_ten,
        thuTu: row.nhom_thu_tu,
        phien: [],
      };
      map.set(row.nhom_slug, nhom);
    } else if (row.nhom_thu_tu < nhom.thuTu) {
      nhom.thuTu = row.nhom_thu_tu;
      nhom.ten = row.nhom_ten;
    }
    nhom.phien.push(mapPhienAdmin(row));
  }
  return [...map.values()]
    .map((n) => ({
      ...n,
      phien: [...n.phien].sort((a, b) => a.thuTu - b.thuTu),
    }))
    .sort((a, b) => a.thuTu - b.thuTu || a.slug.localeCompare(b.slug));
}

/** Catalog public — chỉ phiên đã xuất bản, chưa xoá. */
export async function listHuongDanPublic(): Promise<HuongDanCatalogPublic> {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("cins_huong_dan")
      .select(SELECT_COLS)
      .eq("da_xoa", false)
      .eq("da_xuat_ban", true)
      .order("nhom_thu_tu", { ascending: true })
      .order("thu_tu", { ascending: true })
      .returns<Row[]>();

    if (error) {
      console.error("[huong-dan] list public:", error.message);
      return { nhom: [] };
    }
    return { nhom: groupPublic(data ?? []) };
  } catch (err) {
    console.error("[huong-dan] list public failed:", err);
    return { nhom: [] };
  }
}

/** Catalog admin — mọi phiên chưa soft-delete. */
export async function listHuongDanForAdmin(): Promise<HuongDanNhomAdmin[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_huong_dan")
    .select(SELECT_COLS)
    .eq("da_xoa", false)
    .order("nhom_thu_tu", { ascending: true })
    .order("thu_tu", { ascending: true })
    .returns<Row[]>();

  if (error) throw new Error(error.message);
  return groupAdmin(data ?? []);
}

function normalizeVideoUrl(raw: string | null | undefined): string | null {
  const v = trimTo(raw, MAX_URL);
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.href.replace(/^http:\/\//i, "https://");
  } catch {
    return null;
  }
}

/** Tạo nhóm mới = 1 phiên nháp «Giới thiệu». */
export async function createHuongDanNhom(
  input: CreateHuongDanNhomInput,
  editorId: string | null,
): Promise<{ ok: true; nhomSlug: string } | { ok: false; error: string }> {
  const nhomTen = trimTo(input.nhomTen, MAX_TITLE);
  const nhomSlug = slugifyHuongDan(
    input.nhomSlug || nhomTen,
    "nhom",
  );
  if (!nhomTen) return { ok: false, error: "Thiếu tên nhóm." };
  if (!isValidHuongDanSlug(nhomSlug)) {
    return { ok: false, error: "Slug nhóm không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("cins_huong_dan")
    .select("id")
    .eq("nhom_slug", nhomSlug)
    .eq("da_xoa", false)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    return { ok: false, error: "Nhóm này đã tồn tại." };
  }

  const nhomThuTu =
    typeof input.nhomThuTu === "number" && Number.isFinite(input.nhomThuTu)
      ? Math.max(0, Math.floor(input.nhomThuTu))
      : 100;

  const { error } = await admin.from("cins_huong_dan").insert({
    nhom_slug: nhomSlug,
    nhom_ten: nhomTen,
    nhom_thu_tu: nhomThuTu,
    slug: "gioi-thieu",
    tieu_de: "Giới thiệu hướng dẫn",
    video_url: null,
    noi_dung_html: "<p></p>",
    thu_tu: 10,
    da_xuat_ban: false,
    da_xoa: false,
    id_nguoi_sua: editorId,
    sua_luc: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, nhomSlug };
}

/** Đổi tên / thứ tự nhóm — cascade mọi phiên cùng nhom_slug. */
export async function updateHuongDanNhomMeta(input: {
  nhomSlug: string;
  nhomTen?: string;
  nhomThuTu?: number;
  editorId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nhomSlug = input.nhomSlug.trim();
  if (!isValidHuongDanSlug(nhomSlug)) {
    return { ok: false, error: "Slug nhóm không hợp lệ." };
  }

  const patch: Record<string, unknown> = {
    sua_luc: new Date().toISOString(),
    id_nguoi_sua: input.editorId,
  };
  if (input.nhomTen !== undefined) {
    const ten = trimTo(input.nhomTen, MAX_TITLE);
    if (!ten) return { ok: false, error: "Thiếu tên nhóm." };
    patch.nhom_ten = ten;
  }
  if (input.nhomThuTu !== undefined) {
    if (!Number.isFinite(input.nhomThuTu)) {
      return { ok: false, error: "Thứ tự nhóm không hợp lệ." };
    }
    patch.nhom_thu_tu = Math.max(0, Math.floor(input.nhomThuTu));
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("cins_huong_dan")
    .update(patch)
    .eq("nhom_slug", nhomSlug)
    .eq("da_xoa", false);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Tạo / cập nhật 1 phiên. */
export async function saveHuongDanPhien(
  input: SaveHuongDanPhienInput,
  editorId: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const nhomTen = trimTo(input.nhomTen, MAX_TITLE);
  const nhomSlug = slugifyHuongDan(input.nhomSlug || nhomTen, "nhom");
  const tieuDe = trimTo(input.tieuDe, MAX_TITLE);
  const slug = slugifyHuongDan(input.slug || tieuDe, "phien");
  const noiDungHtml = (input.noiDungHtml ?? "").toString().slice(0, MAX_HTML);
  const videoUrl = normalizeVideoUrl(input.videoUrl);
  const thuTu =
    typeof input.thuTu === "number" && Number.isFinite(input.thuTu)
      ? Math.max(0, Math.floor(input.thuTu))
      : 10;
  const nhomThuTu =
    typeof input.nhomThuTu === "number" && Number.isFinite(input.nhomThuTu)
      ? Math.max(0, Math.floor(input.nhomThuTu))
      : 0;

  if (!nhomTen) return { ok: false, error: "Thiếu tên nhóm." };
  if (!isValidHuongDanSlug(nhomSlug)) {
    return { ok: false, error: "Slug nhóm không hợp lệ." };
  }
  if (!tieuDe) return { ok: false, error: "Thiếu tiêu đề phiên." };
  if (!isValidHuongDanSlug(slug)) {
    return { ok: false, error: "Slug phiên không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const payload = {
    nhom_slug: nhomSlug,
    nhom_ten: nhomTen,
    nhom_thu_tu: nhomThuTu,
    slug,
    tieu_de: tieuDe,
    video_url: videoUrl,
    noi_dung_html: noiDungHtml,
    thu_tu: thuTu,
    da_xuat_ban: Boolean(input.daXuatBan),
    id_nguoi_sua: editorId,
    sua_luc: now,
  };

  if (input.id) {
    const { data, error } = await admin
      .from("cins_huong_dan")
      .update(payload)
      .eq("id", input.id)
      .eq("da_xoa", false)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) return { ok: false, error: error.message };
    if (!data?.id) return { ok: false, error: "Không tìm thấy phiên." };
    return { ok: true, id: data.id };
  }

  const { data, error } = await admin
    .from("cins_huong_dan")
    .insert({ ...payload, da_xoa: false, tao_luc: now })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Slug phiên đã tồn tại trong nhóm này." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data.id };
}

/** Soft-delete 1 phiên. */
export async function softDeleteHuongDanPhien(
  id: string,
  editorId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id.trim()) return { ok: false, error: "Thiếu id." };
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("cins_huong_dan")
    .update({
      da_xoa: true,
      da_xuat_ban: false,
      id_nguoi_sua: editorId,
      sua_luc: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Soft-delete toàn bộ phiên của 1 nhóm. */
export async function softDeleteHuongDanNhom(
  nhomSlug: string,
  editorId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const slug = nhomSlug.trim();
  if (!isValidHuongDanSlug(slug)) {
    return { ok: false, error: "Slug nhóm không hợp lệ." };
  }
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("cins_huong_dan")
    .update({
      da_xoa: true,
      da_xuat_ban: false,
      id_nguoi_sua: editorId,
      sua_luc: new Date().toISOString(),
    })
    .eq("nhom_slug", slug)
    .eq("da_xoa", false);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
