import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { AdminCuratorQuyenRow, PhamViThamDinh } from "./types";

function pickOne<T>(embed: T | T[] | null | undefined): T | null {
  if (embed == null) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

type QuyenEmbedRow = {
  id: string;
  id_nguoi_dung: string;
  pham_vi: PhamViThamDinh;
  id_linh_vuc: string | null;
  id_bai_viet: string | null;
  cap_boi: string | null;
  tao_luc: string;
  nguoi_dung?:
    | { id: string; slug: string; ten_hien_thi: string | null }
    | { id: string; slug: string; ten_hien_thi: string | null }[];
  linh_vuc?:
    | { id: string; ten: string }
    | { id: string; ten: string }[];
  bai_viet?:
    | { id: string; slug: string; tieu_de: string; loai_bai_viet: string }
    | { id: string; slug: string; tieu_de: string; loai_bai_viet: string }[];
};

function mapQuyenRow(row: QuyenEmbedRow): AdminCuratorQuyenRow | null {
  const user = pickOne(row.nguoi_dung);
  if (!user?.id) return null;

  const lv = pickOne(row.linh_vuc);
  const art = pickOne(row.bai_viet);

  return {
    id: row.id,
    phamVi: row.pham_vi,
    taoLuc: row.tao_luc,
    capBoiId: row.cap_boi,
    nguoiDung: {
      id: user.id,
      slug: user.slug,
      tenHienThi: user.ten_hien_thi,
    },
    linhVuc: lv ? { id: lv.id, ten: lv.ten } : null,
    baiViet: art
      ? {
          id: art.id,
          slug: art.slug,
          tieuDe: art.tieu_de,
          loaiBaiViet: art.loai_bai_viet,
        }
      : null,
  };
}

export async function listCuratorQuyenForAdmin(): Promise<AdminCuratorQuyenRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_quyen_tham_dinh")
    .select(
      `
      id,
      id_nguoi_dung,
      pham_vi,
      id_linh_vuc,
      id_bai_viet,
      cap_boi,
      tao_luc,
      nguoi_dung:user_nguoi_dung!article_quyen_tham_dinh_id_nguoi_dung_fkey (
        id,
        slug,
        ten_hien_thi
      ),
      linh_vuc:linh_vuc!article_quyen_tham_dinh_id_linh_vuc_fkey (
        id,
        ten
      ),
      bai_viet:article_bai_viet!article_quyen_tham_dinh_id_bai_viet_fkey (
        id,
        slug,
        tieu_de,
        loai_bai_viet
      )
    `,
    )
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as QuyenEmbedRow[])
    .map(mapQuyenRow)
    .filter((r): r is AdminCuratorQuyenRow => r != null);
}

export async function resolveUserIdBySlug(
  slug: string,
): Promise<{ id: string; slug: string; tenHienThi: string | null } | null> {
  const s = slug.trim().replace(/^@/, "");
  if (!s) return null;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .eq("slug", s)
    .maybeSingle<{ id: string; slug: string; ten_hien_thi: string | null }>();

  if (error) throw new Error(error.message);
  if (!data?.id) return null;

  return {
    id: data.id,
    slug: data.slug,
    tenHienThi: data.ten_hien_thi,
  };
}

export async function resolveArticleIdBySlug(
  slug: string,
): Promise<{ id: string; slug: string; tieuDe: string; loaiBaiViet: string } | null> {
  const s = slug.trim();
  if (!s) return null;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, loai_bai_viet")
    .eq("slug", s)
    .maybeSingle<{
      id: string;
      slug: string;
      tieu_de: string;
      loai_bai_viet: string;
    }>();

  if (error) throw new Error(error.message);
  if (!data?.id) return null;

  return {
    id: data.id,
    slug: data.slug,
    tieuDe: data.tieu_de,
    loaiBaiViet: data.loai_bai_viet,
  };
}

export async function fetchLinhVucOptionsForCurator(): Promise<
  { id: string; ten: string }[]
> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("linh_vuc")
    .select("id, ten")
    .order("ten");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String((r as { id: string }).id),
    ten: String((r as { ten: string }).ten ?? "").trim() || "Lĩnh vực",
  }));
}

export async function grantCuratorQuyen(input: {
  idNguoiDung: string;
  phamVi: PhamViThamDinh;
  idLinhVuc?: string | null;
  idBaiViet?: string | null;
  capBoi: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (input.phamVi === "linh_vuc" && !input.idLinhVuc) {
    return { ok: false, message: "Cần chọn lĩnh vực." };
  }
  if (input.phamVi === "bai_viet" && !input.idBaiViet) {
    return { ok: false, message: "Cần chọn entity." };
  }
  if (input.phamVi === "toan_cuc" && (input.idLinhVuc || input.idBaiViet)) {
    return { ok: false, message: "Phạm vi toàn cục không gắn lĩnh vực/entity." };
  }

  const admin = createServiceRoleClient();

  const { data, error } = await admin
    .from("article_quyen_tham_dinh")
    .insert({
      id_nguoi_dung: input.idNguoiDung,
      pham_vi: input.phamVi,
      id_linh_vuc: input.phamVi === "linh_vuc" ? input.idLinhVuc : null,
      id_bai_viet: input.phamVi === "bai_viet" ? input.idBaiViet : null,
      cap_boi: input.capBoi,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    const msg = error?.message ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      const { data: existing } = await admin
        .from("article_quyen_tham_dinh")
        .select("id")
        .eq("id_nguoi_dung", input.idNguoiDung)
        .eq("pham_vi", input.phamVi)
        .eq("da_xoa", false)
        .maybeSingle<{ id: string }>();
      if (existing?.id) {
        return { ok: false, message: "User đã có quyền curator với phạm vi này." };
      }
      const { data: revived, error: reviveErr } = await admin
        .from("article_quyen_tham_dinh")
        .update({ da_xoa: false, cap_boi: input.capBoi })
        .eq("id_nguoi_dung", input.idNguoiDung)
        .eq("pham_vi", input.phamVi)
        .eq("da_xoa", true)
        .select("id")
        .maybeSingle<{ id: string }>();
      if (reviveErr || !revived?.id) {
        return { ok: false, message: reviveErr?.message ?? "Không gán được quyền." };
      }
      return { ok: true, id: revived.id };
    }
    return { ok: false, message: error?.message ?? "Không gán được quyền." };
  }

  return { ok: true, id: data.id };
}

export async function revokeCuratorQuyenById(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("article_quyen_tham_dinh")
    .update({ da_xoa: true })
    .eq("id", id)
    .eq("da_xoa", false);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
