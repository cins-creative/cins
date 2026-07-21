import "server-only";

import { cache } from "react";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { getStepStatus, type TimelineStepStatus } from "@/lib/truong/timeline";

import { orgSuKienHref } from "./su-kien-routes";
import { demDangKySeThamGia } from "./su-kien-dang-ky";
import { listLoaiVeBySuKienIds, minGiaTuLoaiVe } from "./su-kien-loai-ve";
import {
  isLoaiSuKien,
  type LoaiSuKien,
  type SuKienCardData,
  type SuKienLoaiVe,
} from "./su-kien-constants";

export type SuKienListItem = SuKienCardData & {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgLoai: string;
  orgHref: string;
  orgAvatarUrl: string | null;
  status: TimelineStepStatus;
};

type SuKienRow = {
  id: string;
  ten: string;
  loai_su_kien: string;
  mo_ta: string | null;
  noi_dung: string | null;
  cover_id: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  tinh_thanh: string | null;
  dia_diem: string | null;
  mien_phi: boolean | null;
  gia_ve: number | null;
  cach_mua_ve: string | null;
  slot_toi_da: number | null;
  id_to_chuc: string;
  org_to_chuc:
    | {
        id?: string;
        slug?: string | null;
        ten?: string | null;
        loai_to_chuc?: string | null;
        avatar_id?: string | null;
        logo_id?: string | null;
      }
    | {
        id?: string;
        slug?: string | null;
        ten?: string | null;
        loai_to_chuc?: string | null;
        avatar_id?: string | null;
        logo_id?: string | null;
      }[]
    | null;
};

const SU_KIEN_LISTING_SELECT =
  "id, ten, loai_su_kien, mo_ta, noi_dung, cover_id, bat_dau, ket_thuc, tinh_thanh, dia_diem, mien_phi, gia_ve, cach_mua_ve, slot_toi_da, id_to_chuc, org_to_chuc!inner ( id, slug, ten, loai_to_chuc, avatar_id, logo_id )";

function readOrg(row: SuKienRow) {
  const embed = row.org_to_chuc;
  const org = Array.isArray(embed) ? embed[0] : embed;
  const id = org?.id?.trim() ?? row.id_to_chuc?.trim();
  const slug = org?.slug?.trim();
  const ten = org?.ten?.trim();
  const loai = org?.loai_to_chuc?.trim() ?? "";
  if (!id || !slug || !ten) return null;
  const orgAvatarId =
    (Array.isArray(embed) ? embed[0] : embed)?.avatar_id ??
    (Array.isArray(embed) ? embed[0] : embed)?.logo_id ??
    null;
  return { id, slug, ten, loai, orgAvatarId };
}

function mapRow(
  row: SuKienRow,
  soDangKy: number,
  loaiVe: SuKienLoaiVe[] = [],
): SuKienListItem | null {
  const org = readOrg(row);
  if (!org) return null;

  const loai: LoaiSuKien = isLoaiSuKien(row.loai_su_kien)
    ? row.loai_su_kien
    : "meetup";
  const status = getStepStatus(row.bat_dau, row.ket_thuc);
  const mienPhi = row.mien_phi !== false;
  const giaFromLoai = !mienPhi ? minGiaTuLoaiVe(loaiVe) : null;

  return {
    id: row.id,
    ten: row.ten,
    loaiSuKien: loai,
    moTa: row.mo_ta?.trim() || null,
    noiDung: row.noi_dung?.trim() || null,
    coverId: row.cover_id ?? null,
    coverSrc: row.cover_id
      ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
      : null,
    batDau: row.bat_dau,
    ketThuc: row.ket_thuc,
    tinhThanh: row.tinh_thanh?.trim() || null,
    diaDiem: row.dia_diem?.trim() || null,
    mienPhi,
    giaVe:
      giaFromLoai != null
        ? giaFromLoai
        : typeof row.gia_ve === "number" && row.gia_ve >= 0
          ? row.gia_ve
          : null,
    loaiVe: mienPhi ? [] : loaiVe,
    cachMuaVe: mienPhi ? null : row.cach_mua_ve?.trim() || null,
    slotToiDa: typeof row.slot_toi_da === "number" ? row.slot_toi_da : null,
    soDangKy,
    orgId: org.id,
    orgSlug: org.slug,
    orgTen: org.ten,
    orgLoai: org.loai,
    orgHref: orgSuKienHref(org.loai, org.slug),
    orgAvatarUrl: org.orgAvatarId
      ? resolveTruongImageSrcSync(org.orgAvatarId, ["public", "avatar"])
      : null,
    status,
  };
}

/** Danh sách sự kiện toàn cục cho trang `/su-kien`. */
export const listSuKienForListing = cache(async function listSuKienForListing(): Promise<
  SuKienListItem[]
> {
  if (!hasSupabaseEnv()) return [];

  const admin = createServiceRoleClient();
  const pastCutoff = new Date();
  pastCutoff.setDate(pastCutoff.getDate() - 90);
  const cutoffIso = pastCutoff.toISOString();

  const { data, error } = await admin
    .from("org_su_kien")
    .select(SU_KIEN_LISTING_SELECT)
    .gte("bat_dau", cutoffIso)
    .order("bat_dau", { ascending: true })
    .limit(120)
    .returns<SuKienRow[]>();

  if (error || !data?.length) return [];

  const counts = await demDangKySeThamGia(data.map((row) => row.id));
  const loaiVeMap = await listLoaiVeBySuKienIds(data.map((row) => row.id));
  const items: SuKienListItem[] = [];

  for (const row of data) {
    const mapped = mapRow(
      row,
      counts.get(row.id) ?? 0,
      loaiVeMap.get(row.id) ?? [],
    );
    if (mapped) items.push(mapped);
  }

  items.sort((a, b) => {
    const statusOrder =
      (a.status === "active" ? 0 : a.status === "upcoming" ? 1 : 2) -
      (b.status === "active" ? 0 : b.status === "upcoming" ? 1 : 2);
    if (statusOrder !== 0) return statusOrder;
    return new Date(a.batDau).getTime() - new Date(b.batDau).getTime();
  });

  return items;
});
