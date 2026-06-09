import "server-only";

import { cache } from "react";

import { labelLoaiCoSo } from "@/lib/to-chuc/constants";
import {
  parseCoSoPageCauHinh,
  type CoSoPageCauHinh,
} from "@/lib/to-chuc/co-so-page-cau-hinh";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { fetchBaiDang, fetchHinhAnh } from "@/lib/truong/queries";
import type {
  TruongBaiDang,
  TruongDetail,
  TruongHinhAnh,
} from "@/lib/truong/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type CoSoFilterChip = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  count: number;
};

export type CoSoDetailPayload = {
  school: TruongDetail;
  baidang: TruongBaiDang[];
  hinhanh: TruongHinhAnh[];
  loaiCoSoLabel: string;
  daVerify: boolean;
  maCoSo: string;
  pageConfig: CoSoPageCauHinh;
  filters: CoSoFilterChip[];
};

type OrgRow = {
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
  gioi_thieu_truong: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  tinh_thanh: string | null;
  dia_chi: string | null;
  dien_thoai: string | null;
  email_lien_he: string | null;
  cau_hinh: unknown;
  org_co_so_dao_tao: {
    ma_co_so: string;
    ten_chinh_thuc: string;
    loai_co_so: string;
    nam_thanh_lap: number | null;
    website: string | null;
    giay_phep_dao_tao: string | null;
    da_verify: boolean;
  } | null;
};

function mapCoSoToTruongDetail(
  org: OrgRow,
  ext: NonNullable<OrgRow["org_co_so_dao_tao"]>,
  avatar_src: string | null,
  cover_src: string | null,
): TruongDetail {
  return {
    id: org.id,
    slug: org.slug,
    ten: org.ten,
    org_loai: "co_so_dao_tao",
    logo_id: null,
    avatar_id: org.avatar_id,
    avatar_src,
    cover_id: org.cover_id,
    cover_src,
    mo_ta: org.mo_ta,
    gioi_thieu_truong: org.gioi_thieu_truong,
    tinh_thanh: org.tinh_thanh,
    dia_chi: org.dia_chi,
    dien_thoai: org.dien_thoai,
    email_lien_he: org.email_lien_he,
    ma_truong: null,
    loai_truong: ext.loai_co_so,
    website: ext.website,
    ten_chinh_thuc: ext.ten_chinh_thuc,
    ten_tieng_anh:
      ext.ten_chinh_thuc.trim() !== org.ten.trim()
        ? ext.ten_chinh_thuc.trim()
        : null,
    nam_thanh_lap: ext.nam_thanh_lap,
    giay_phep_dao_tao: ext.giay_phep_dao_tao?.trim() || null,
    hoc_phi_nam_tu: null,
    hoc_phi_nam_den: null,
    co_ktx: null,
    ktx_gia_thang: null,
    nganhCount: 0,
    nganhTags: [],
    programs: [],
  };
}

async function loadCoSoDetailPayload(
  slug: string,
): Promise<CoSoDetailPayload | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = createPublicSupabaseClient();
  const { data: org } = await supabase
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, gioi_thieu_truong, avatar_id, cover_id, tinh_thanh, dia_chi, dien_thoai, email_lien_he, cau_hinh, org_co_so_dao_tao(ma_co_so, ten_chinh_thuc, loai_co_so, nam_thanh_lap, website, giay_phep_dao_tao, da_verify)",
    )
    .eq("slug", slug)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle<OrgRow>();

  if (!org?.org_co_so_dao_tao) return null;

  const ext = org.org_co_so_dao_tao;
  const avatarImageId = org.avatar_id?.trim() || null;
  const avatar_src = avatarImageId
    ? resolveTruongImageSrcSync(avatarImageId, ["public", "avatar"])
    : null;
  const cover_src = org.cover_id?.trim()
    ? resolveTruongImageSrcSync(org.cover_id, ["public", "cover", "medium"])
    : null;

  let filters: CoSoFilterChip[] = [];
  const { data: filterRows, error: filterError } = await supabase
    .from("filter_nhan")
    .select("id, ten, slug, mau, thu_tu")
    .eq("id_to_chuc", org.id)
    .order("thu_tu", { ascending: true });

  if (!filterError && filterRows) {
    filters = filterRows.map((row) => ({
      id: row.id,
      ten: row.ten,
      slug: row.slug,
      mau: row.mau,
      count: 0,
    }));
  }

  const [baidang, hinhanh] = await Promise.all([
    fetchBaiDang(supabase, org.id),
    fetchHinhAnh(supabase, org.id),
  ]);

  return {
    school: mapCoSoToTruongDetail(org, ext, avatar_src, cover_src),
    baidang,
    hinhanh,
    loaiCoSoLabel: labelLoaiCoSo(ext.loai_co_so),
    daVerify: ext.da_verify,
    maCoSo: ext.ma_co_so,
    pageConfig: parseCoSoPageCauHinh(org.cau_hinh),
    filters,
  };
}

export async function getCoSoMetaBySlugCached(slug: string) {
  const payload = await getCoSoDetailPayloadCached(slug);
  if (!payload) return null;
  return {
    ten: payload.school.ten,
    moTa: payload.school.mo_ta,
  };
}

export const getCoSoDetailPayloadCached = cache(loadCoSoDetailPayload);

/** @deprecated Dùng `getCoSoDetailPayloadCached`. */
export const getCoSoPagePayloadCached = getCoSoDetailPayloadCached;
