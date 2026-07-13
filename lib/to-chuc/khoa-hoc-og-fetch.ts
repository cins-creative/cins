import "server-only";

import { cache } from "react";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { KhoaHocOgContext } from "@/lib/to-chuc/khoa-hoc-og-card";
import {
  formatKhoaHocPhi,
  formatThoiLuongKhoa,
  labelHinhThucLop,
  labelLoaiMoHinhKhoa,
  labelTrangThaiKhoaHoc,
  labelTrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-labels";
import { parseKhoaHocNoiDungBlocks } from "@/lib/to-chuc/khoa-hoc-meta-blocks";
import type {
  HinhThucLop,
  LoaiMoHinhKhoa,
  TrangThaiKhoaHoc,
  TrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-types";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

type OrgEmbed = {
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type Row = {
  id: string;
  slug: string;
  ten_khoa_hoc: string;
  mo_ta: string | null;
  loai_mo_hinh: LoaiMoHinhKhoa;
  trinh_do_dau_vao: TrinhDoDauVao;
  trang_thai_khoa_hoc: TrangThaiKhoaHoc;
  thoi_luong_buoi: number | null;
  thoi_luong_phut_moi_buoi: number | null;
  hoc_phi: number | null;
  avatar_id: string | null;
  cover_id: string | null;
  noi_dung_blocks?: unknown;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

const KHOA_OG_SELECT = `
  id, slug, ten_khoa_hoc, mo_ta, loai_mo_hinh, trinh_do_dau_vao,
  trang_thai_khoa_hoc, thoi_luong_buoi, thoi_luong_phut_moi_buoi, hoc_phi,
  avatar_id, cover_id, noi_dung_blocks,
  org_to_chuc:org_to_chuc!inner(slug, ten, loai_to_chuc, avatar_id, logo_id)
`;

const KHOA_OG_SELECT_NO_BLOCKS = `
  id, slug, ten_khoa_hoc, mo_ta, loai_mo_hinh, trinh_do_dau_vao,
  trang_thai_khoa_hoc, thoi_luong_buoi, thoi_luong_phut_moi_buoi, hoc_phi,
  avatar_id, cover_id,
  org_to_chuc:org_to_chuc!inner(slug, ten, loai_to_chuc, avatar_id, logo_id)
`;

function pickOrg(org: Row["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? org[0] ?? null : org;
}

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

async function fetchFirstHinhThuc(khoaId: string): Promise<HinhThucLop | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("org_lop_hoc")
      .select("hinh_thuc, ngay_khai_giang")
      .eq("id_khoa_hoc", khoaId)
      .order("ngay_khai_giang", { ascending: true })
      .limit(1)
      .maybeSingle();
    return ((data?.hinh_thuc as HinhThucLop | undefined) ?? null) || null;
  } catch {
    return null;
  }
}

async function loadKhoaHocOgContext(
  orgSlug: string,
  khoaSlug: string,
): Promise<KhoaHocOgContext | null> {
  const orgNorm = orgSlug.trim();
  const khoaNorm = khoaSlug.trim();
  if (!orgNorm || !khoaNorm) return null;

  try {
    const supabase = createServiceRoleClient();

    let { data, error } = await supabase
      .from("org_khoa_hoc")
      .select(KHOA_OG_SELECT)
      .eq("slug", khoaNorm)
      .eq("org_to_chuc.slug", orgNorm)
      .maybeSingle<Row>();

    if (error?.message?.includes("noi_dung_blocks")) {
      const fallback = await supabase
        .from("org_khoa_hoc")
        .select(KHOA_OG_SELECT_NO_BLOCKS)
        .eq("slug", khoaNorm)
        .eq("org_to_chuc.slug", orgNorm)
        .maybeSingle<Row>();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) return null;

    const org = pickOrg(data.org_to_chuc);
    if (!org?.slug) return null;
    if (org.loai_to_chuc && org.loai_to_chuc !== "co_so_dao_tao") return null;

    const parsed = parseKhoaHocNoiDungBlocks(data.noi_dung_blocks);
    if (parsed.cheDoHienThi === "an") return null;

    const loaiMoHinh: LoaiMoHinhKhoa =
      data.loai_mo_hinh === "lien_tuc_theo_thang"
        ? "lien_tuc_theo_thang"
        : "cohort_co_dinh";
    const hocPhiRaw = data.hoc_phi != null ? Number(data.hoc_phi) : null;
    const hocPhiLabel = formatKhoaHocPhi(hocPhiRaw, loaiMoHinh);
    const hocPhiSuffix = loaiMoHinh === "lien_tuc_theo_thang" ? "/th" : "";
    const status = labelTrangThaiKhoaHoc(data.trang_thai_khoa_hoc);
    const thoiLuong = formatThoiLuongKhoa(
      data.thoi_luong_buoi,
      data.thoi_luong_phut_moi_buoi,
    );

    const coverUrl =
      resolveTruongImageSrcSync(data.avatar_id, ["public", "avatar", "medium"]) ??
      resolveTruongImageSrcSync(data.cover_id, ["public", "cover", "medium"]) ??
      null;

    const orgAvatarId = org.avatar_id ?? org.logo_id ?? null;
    const orgAvatarUrl = orgAvatarId
      ? resolveTruongImageSrcSync(orgAvatarId, ["public", "avatar"])
      : null;

    const hinhThuc = await fetchFirstHinhThuc(data.id);

    return {
      title: data.ten_khoa_hoc?.trim() || "Khóa học",
      orgTen: org.ten?.trim() || orgNorm,
      orgAvatarUrl,
      summary: truncate(data.mo_ta, 150),
      coverUrl,
      moHinhLabel: labelLoaiMoHinhKhoa(loaiMoHinh),
      trinhDoLabel: labelTrinhDoDauVao(data.trinh_do_dau_vao),
      hinhThucLabel: hinhThuc ? labelHinhThucLop(hinhThuc) : null,
      hocPhiLabel: hocPhiLabel === "—" ? "Liên hệ" : hocPhiLabel.replace(/\/th$/, ""),
      hocPhiSuffix: hocPhiLabel === "—" ? "" : hocPhiSuffix,
      thoiLuongLabel: thoiLuong === "—" ? null : thoiLuong,
      trangThaiLabel: status.text,
      trangThaiTone: status.tone,
      orgSlug: org.slug.trim(),
      khoaSlug: data.slug?.trim() || khoaNorm,
    };
  } catch {
    return null;
  }
}

/** OG context nhẹ cho trang chi tiết khóa học. */
export const fetchKhoaHocOgContext = cache(loadKhoaHocOgContext);
