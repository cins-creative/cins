import "server-only";

import { cache } from "react";

import { labelLoaiCoSo } from "@/lib/to-chuc/constants";
import { labelTinhThanh } from "@/lib/truong/contact";
import { getAvatarUrl, getProfileCoverUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type CoSoFilterChip = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  count: number;
};

export type CoSoPagePayload = {
  id: string;
  slug: string;
  ten: string;
  moTa: string | null;
  gioiThieuTruong: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  tinhThanhLabel: string | null;
  diaChi: string | null;
  dienThoai: string | null;
  emailLienHe: string | null;
  website: string | null;
  tenChinhThuc: string;
  loaiCoSoLabel: string;
  namThanhLap: number | null;
  daVerify: boolean;
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
  org_co_so_dao_tao: {
    ten_chinh_thuc: string;
    loai_co_so: string;
    nam_thanh_lap: number | null;
    website: string | null;
    da_verify: boolean;
  } | null;
};

async function loadCoSoPagePayload(slug: string): Promise<CoSoPagePayload | null> {
  if (!hasSupabaseEnv()) return null;

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, gioi_thieu_truong, avatar_id, cover_id, tinh_thanh, dia_chi, dien_thoai, email_lien_he, org_co_so_dao_tao(ten_chinh_thuc, loai_co_so, nam_thanh_lap, website, da_verify)",
    )
    .eq("slug", slug)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle<OrgRow>();

  if (!org?.org_co_so_dao_tao) return null;

  const ext = org.org_co_so_dao_tao;

  let filters: CoSoFilterChip[] = [];
  const { data: filterRows, error: filterError } = await admin
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

  return {
    id: org.id,
    slug: org.slug,
    ten: org.ten,
    moTa: org.mo_ta,
    gioiThieuTruong: org.gioi_thieu_truong,
    avatarUrl: getAvatarUrl(org.avatar_id),
    coverUrl: getProfileCoverUrl(org.cover_id),
    tinhThanhLabel: labelTinhThanh(org.tinh_thanh),
    diaChi: org.dia_chi,
    dienThoai: org.dien_thoai,
    emailLienHe: org.email_lien_he,
    website: ext.website,
    tenChinhThuc: ext.ten_chinh_thuc,
    loaiCoSoLabel: labelLoaiCoSo(ext.loai_co_so),
    namThanhLap: ext.nam_thanh_lap,
    daVerify: ext.da_verify,
    filters,
  };
}

export const getCoSoPagePayloadCached = cache(loadCoSoPagePayload);
