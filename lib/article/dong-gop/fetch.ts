import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  ArticleDongGopAdminItem,
  ArticleDongGopListItem,
  ArticleDongGopRow,
  ArticleQuyenThamDinhRow,
  ArticleTacGiaListItem,
  TrangThaiDongGop,
} from "./types";

function pickOne<T>(embed: T | T[] | null | undefined): T | null {
  if (embed == null) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

type DongGopEmbedRow = ArticleDongGopRow & {
  nguoi_dong_gop?:
    | ArticleDongGopListItem["nguoi_dong_gop"]
    | NonNullable<ArticleDongGopListItem["nguoi_dong_gop"]>[];
};

function mapDongGopListItem(row: DongGopEmbedRow): ArticleDongGopListItem {
  const { nguoi_dong_gop, ...rest } = row;
  return {
    ...rest,
    nguoi_dong_gop: pickOne(nguoi_dong_gop),
  };
}

type DongGopAdminEmbedRow = DongGopEmbedRow & {
  bai_viet?:
    | ArticleDongGopAdminItem["bai_viet"]
    | NonNullable<ArticleDongGopAdminItem["bai_viet"]>[];
};

function mapDongGopAdminItem(row: DongGopAdminEmbedRow): ArticleDongGopAdminItem {
  const { bai_viet, ...rest } = row;
  return {
    ...mapDongGopListItem(rest),
    bai_viet: pickOne(bai_viet),
  };
}

type TacGiaEmbedRow = Omit<ArticleTacGiaListItem, "nguoi_dung"> & {
  nguoi_dung?:
    | ArticleTacGiaListItem["nguoi_dung"]
    | NonNullable<ArticleTacGiaListItem["nguoi_dung"]>[];
};

function mapTacGiaListItem(row: TacGiaEmbedRow): ArticleTacGiaListItem {
  const { nguoi_dung, ...rest } = row;
  return {
    ...rest,
    nguoi_dung: pickOne(nguoi_dung),
  };
}

const DONG_GOP_SELECT = `
  id,
  id_bai_viet,
  id_nguoi_dong_gop,
  noi_dung,
  trang_thai,
  ghi_chu_duyet,
  id_nguoi_duyet,
  tao_luc,
  cap_nhat_luc,
  duyet_luc,
  da_xoa,
  hien_thi
`;

const DONG_GOP_WITH_USER = `
  ${DONG_GOP_SELECT},
  nguoi_dong_gop:user_nguoi_dung!article_dong_gop_id_nguoi_dong_gop_fkey (
    id,
    slug,
    ten_hien_thi,
    avatar_id
  )
`;

export async function fetchDongGopListForArticle(
  idBaiViet: string,
  options?: { includeHidden?: boolean },
): Promise<ArticleDongGopListItem[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("article_dong_gop")
    .select(DONG_GOP_WITH_USER)
    .eq("id_bai_viet", idBaiViet)
    .eq("da_xoa", false)
    .order("cap_nhat_luc", { ascending: false });

  if (!options?.includeHidden) {
    q = q.eq("hien_thi", true);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as DongGopEmbedRow[]).map(mapDongGopListItem);
}

export async function fetchDongGopById(
  id: string,
): Promise<ArticleDongGopRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_dong_gop")
    .select(DONG_GOP_SELECT)
    .eq("id", id)
    .eq("da_xoa", false)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ArticleDongGopRow | null) ?? null;
}

export async function fetchDongGopByUserAndArticle(
  idNguoiDung: string,
  idBaiViet: string,
): Promise<ArticleDongGopRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_dong_gop")
    .select(DONG_GOP_SELECT)
    .eq("id_nguoi_dong_gop", idNguoiDung)
    .eq("id_bai_viet", idBaiViet)
    .eq("da_xoa", false)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ArticleDongGopRow | null) ?? null;
}

export async function fetchDongGopPendingForAdmin(
  limit = 50,
): Promise<ArticleDongGopAdminItem[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_dong_gop")
    .select(
      `
      ${DONG_GOP_WITH_USER},
      bai_viet:article_bai_viet!article_dong_gop_id_bai_viet_fkey (
        id,
        slug,
        tieu_de,
        loai_bai_viet
      )
    `,
    )
    .eq("trang_thai", "cho_duyet")
    .eq("da_xoa", false)
    .order("cap_nhat_luc", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as DongGopAdminEmbedRow[]).map(mapDongGopAdminItem);
}

export async function fetchTacGiaListForArticle(
  idBaiViet: string,
): Promise<ArticleTacGiaListItem[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_tac_gia")
    .select(
      `
      id,
      id_bai_viet,
      id_nguoi_dung,
      id_dong_gop,
      vai_tro,
      la_hien_tai,
      tao_luc,
      nguoi_dung:user_nguoi_dung!article_tac_gia_id_nguoi_dung_fkey (
        id,
        slug,
        ten_hien_thi,
        avatar_id
      )
    `,
    )
    .eq("id_bai_viet", idBaiViet)
    .order("tao_luc", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as TacGiaEmbedRow[]).map(mapTacGiaListItem);
}

export async function fetchQuyenThamDinhForUser(
  idNguoiDung: string,
): Promise<ArticleQuyenThamDinhRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_quyen_tham_dinh")
    .select(
      "id, id_nguoi_dung, pham_vi, id_linh_vuc, id_bai_viet, cap_boi, tao_luc, da_xoa",
    )
    .eq("id_nguoi_dung", idNguoiDung)
    .eq("da_xoa", false);

  if (error) throw new Error(error.message);
  return (data ?? []) as ArticleQuyenThamDinhRow[];
}

export async function countDongGopByTrangThai(
  idBaiViet: string,
  trangThai: TrangThaiDongGop,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { count, error } = await admin
    .from("article_dong_gop")
    .select("id", { count: "exact", head: true })
    .eq("id_bai_viet", idBaiViet)
    .eq("trang_thai", trangThai)
    .eq("da_xoa", false)
    .eq("hien_thi", true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchDongGopListForAdmin(
  options?: {
    trangThai?: TrangThaiDongGop;
    limit?: number;
    idBaiViet?: string;
  },
): Promise<ArticleDongGopAdminItem[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("article_dong_gop")
    .select(
      `
      ${DONG_GOP_WITH_USER},
      bai_viet:article_bai_viet!article_dong_gop_id_bai_viet_fkey (
        id,
        slug,
        tieu_de,
        loai_bai_viet,
        noi_dung,
        id_tac_gia_chinh
      )
    `,
    )
    .eq("da_xoa", false)
    .order("cap_nhat_luc", { ascending: false });

  if (options?.trangThai) {
    q = q.eq("trang_thai", options.trangThai);
  }
  if (options?.idBaiViet) {
    q = q.eq("id_bai_viet", options.idBaiViet);
  }
  if (options?.limit) {
    q = q.limit(options.limit);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as DongGopAdminEmbedRow[]).map(mapDongGopAdminItem);
}
