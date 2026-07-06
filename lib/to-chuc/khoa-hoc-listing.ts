import "server-only";

import { buildSupabaseOrIlike } from "@/lib/search/ilike-patterns";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import { parseKhoaHocNoiDungBlocks } from "@/lib/to-chuc/khoa-hoc-meta-blocks";
import {
  formatKhoaHocPhi,
  formatThoiLuongKhoa,
  labelHinhThucLop,
  labelLoaiMoHinhKhoa,
  labelTrangThaiKhoaHoc,
  labelTrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type {
  HinhThucLop,
  LoaiMoHinhKhoa,
  TrangThaiKhoaHoc,
  TrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-types";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export type KhoaHocListItem = {
  id: string;
  tenKhoaHoc: string;
  moTa: string | null;
  orgTen: string;
  orgSlug: string;
  orgAvatarUrl: string | null;
  coverUrl: string | null;
  loaiMoHinh: LoaiMoHinhKhoa;
  loaiMoHinhLabel: string;
  hinhThuc: HinhThucLop | null;
  hinhThucLabel: string | null;
  trinhDoLabel: string;
  trangThaiLabel: string;
  trangThaiTone: "open" | "soon" | "pause";
  thoiLuongLabel: string;
  hocPhi: number | null;
  hocPhiLabel: string;
  hocPhiSuffix: string;
  href: string;
};

export type KhoaHocListing = {
  items: KhoaHocListItem[];
  total: number;
};

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

const OPEN_STATUSES: TrangThaiKhoaHoc[] = [
  "sap_khai_giang",
  "dang_mo_don",
  "dang_hoc",
];

const KHOA_HOC_LIST_SELECT = `
  id,
  slug,
  ten_khoa_hoc,
  mo_ta,
  loai_mo_hinh,
  trinh_do_dau_vao,
  trang_thai_khoa_hoc,
  thoi_luong_buoi,
  thoi_luong_phut_moi_buoi,
  hoc_phi,
  avatar_id,
  cover_id,
  noi_dung_blocks,
  org_to_chuc:org_to_chuc!inner(slug, ten, loai_to_chuc, avatar_id, logo_id)
`;

const KHOA_HOC_LIST_SELECT_NO_BLOCKS = `
  id,
  slug,
  ten_khoa_hoc,
  mo_ta,
  loai_mo_hinh,
  trinh_do_dau_vao,
  trang_thai_khoa_hoc,
  thoi_luong_buoi,
  thoi_luong_phut_moi_buoi,
  hoc_phi,
  avatar_id,
  cover_id,
  org_to_chuc:org_to_chuc!inner(slug, ten, loai_to_chuc, avatar_id, logo_id)
`;

function pickOrg(org: Row["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? org[0] ?? null : org;
}

function orgAvatar(org: OrgEmbed | null): string | null {
  const avatarId = org?.avatar_id ?? org?.logo_id ?? null;
  return avatarId
    ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
    : null;
}

function coverUrl(row: Row): string | null {
  return (
    resolveTruongImageSrcSync(row.avatar_id, ["public", "avatar", "medium"]) ??
    resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"]) ??
    null
  );
}

type LopMetaRow = {
  id: string;
  id_khoa_hoc: string;
  hinh_thuc: HinhThucLop;
};

function hocPhiSuffix(loaiMoHinh: LoaiMoHinhKhoa): string {
  return loaiMoHinh === "lien_tuc_theo_thang" ? "/th" : "";
}

async function fetchLopHinhThucForKhoa(
  khoaIds: string[],
): Promise<Map<string, HinhThucLop | null>> {
  const map = new Map<string, HinhThucLop | null>();
  for (const id of khoaIds) map.set(id, null);
  if (!khoaIds.length) return map;

  const supabase = createServiceRoleClient();
  const { data: rows } = await supabase
    .from("org_lop_hoc")
    .select("id, id_khoa_hoc, hinh_thuc, ngay_khai_giang")
    .in("id_khoa_hoc", khoaIds)
    .order("ngay_khai_giang", { ascending: true });

  for (const row of (rows ?? []) as LopMetaRow[]) {
    if (map.get(row.id_khoa_hoc) != null) continue;
    map.set(row.id_khoa_hoc, row.hinh_thuc ?? null);
  }
  return map;
}

function mapRow(
  row: Row,
  hinhThuc: HinhThucLop | null,
): KhoaHocListItem | null {
  const org = pickOrg(row.org_to_chuc);
  const orgSlug = org?.slug?.trim();
  if (!org || !orgSlug) return null;
  if (org.loai_to_chuc && org.loai_to_chuc !== "co_so_dao_tao") return null;

  const parsed = parseKhoaHocNoiDungBlocks(row.noi_dung_blocks);
  if (parsed.cheDoHienThi === "an") return null;

  const courseSlug = row.slug?.trim();
  if (!courseSlug) return null;

  const status = labelTrangThaiKhoaHoc(row.trang_thai_khoa_hoc);
  const loaiMoHinh: LoaiMoHinhKhoa =
    row.loai_mo_hinh === "lien_tuc_theo_thang"
      ? "lien_tuc_theo_thang"
      : "cohort_co_dinh";
  const hocPhiRaw = row.hoc_phi != null ? Number(row.hoc_phi) : null;
  const hocPhiSuffixStr = hocPhiSuffix(loaiMoHinh);
  const hocPhiLabel = formatKhoaHocPhi(hocPhiRaw, loaiMoHinh);

  return {
    id: row.id,
    tenKhoaHoc: row.ten_khoa_hoc?.trim() || "Khóa học",
    moTa: row.mo_ta?.trim() || null,
    orgTen: org.ten?.trim() || orgSlug,
    orgSlug,
    orgAvatarUrl: orgAvatar(org),
    coverUrl: coverUrl(row),
    loaiMoHinh,
    loaiMoHinhLabel: labelLoaiMoHinhKhoa(loaiMoHinh),
    hinhThuc,
    hinhThucLabel: hinhThuc ? labelHinhThucLop(hinhThuc) : null,
    trinhDoLabel: labelTrinhDoDauVao(row.trinh_do_dau_vao),
    trangThaiLabel: status.text,
    trangThaiTone: status.tone,
    thoiLuongLabel: formatThoiLuongKhoa(
      row.thoi_luong_buoi,
      row.thoi_luong_phut_moi_buoi,
    ),
    hocPhi: hocPhiRaw,
    hocPhiLabel,
    hocPhiSuffix: hocPhiSuffixStr,
    href: coSoKhoaHocDetailPath(orgSlug, courseSlug),
  };
}

function matchesKhoaQuery(item: KhoaHocListItem, query: string): boolean {
  const ql = query.trim().toLowerCase();
  if (!ql) return true;
  const haystack = [
    item.tenKhoaHoc,
    item.moTa,
    item.orgTen,
    item.orgSlug,
    item.loaiMoHinhLabel,
    item.hinhThucLabel,
    item.trinhDoLabel,
    item.trangThaiLabel,
    item.thoiLuongLabel,
    item.hocPhiLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(ql);
}

/**
 * Khóa học đang mở toàn sàn cho trang `/tim-khoa-hoc`.
 * Service role (server-only) — catalog công khai; RLS anon thường không đọc được `org_khoa_hoc`.
 * Lọc: cơ sở đào tạo, trạng thái mở, không ẩn (`cheDoHienThi`).
 */
export async function loadKhoaHocListing(
  limit = 200,
  offset = 0,
  query?: string,
): Promise<KhoaHocListing> {
  try {
    const supabase = createServiceRoleClient();
    const q = query?.trim() ?? "";
    const searchMode = q.length > 0;
    const fetchLimit = searchMode ? 200 : limit;
    const fetchOffset = searchMode ? 0 : offset;

    let queryBuilder = supabase
      .from("org_khoa_hoc")
      .select(KHOA_HOC_LIST_SELECT, { count: "exact" })
      .eq("org_to_chuc.loai_to_chuc", "co_so_dao_tao")
      .in("trang_thai_khoa_hoc", OPEN_STATUSES);

    if (searchMode) {
      queryBuilder = queryBuilder.or(
        buildSupabaseOrIlike(["ten_khoa_hoc", "mo_ta", "slug"], q),
      );
    }

    let { data, error, count } = await queryBuilder
      .order("ten_khoa_hoc", { ascending: true })
      .range(fetchOffset, fetchOffset + fetchLimit - 1)
      .returns<Row[]>();

    if (error?.message.includes("noi_dung_blocks")) {
      let fallbackBuilder = supabase
        .from("org_khoa_hoc")
        .select(KHOA_HOC_LIST_SELECT_NO_BLOCKS, { count: "exact" })
        .eq("org_to_chuc.loai_to_chuc", "co_so_dao_tao")
        .in("trang_thai_khoa_hoc", OPEN_STATUSES);
      if (searchMode) {
        fallbackBuilder = fallbackBuilder.or(
          buildSupabaseOrIlike(["ten_khoa_hoc", "mo_ta", "slug"], q),
        );
      }
      const fallback = await fallbackBuilder
        .order("ten_khoa_hoc", { ascending: true })
        .range(fetchOffset, fetchOffset + fetchLimit - 1)
        .returns<Row[]>();
      data = fallback.data;
      error = fallback.error;
      count = fallback.count;
    }

    if (error || !data) return { items: [], total: 0 };

    const lopMap = await fetchLopHinhThucForKhoa(data.map((row) => row.id));

    let items = data
      .map((row) => mapRow(row, lopMap.get(row.id) ?? null))
      .filter((item): item is KhoaHocListItem => item != null);

    if (searchMode) {
      items = items.filter((item) => matchesKhoaQuery(item, q));
      const total = items.length;
      items = items.slice(offset, offset + limit);
      return { items, total };
    }

    return { items, total: count ?? items.length };
  } catch {
    return { items: [], total: 0 };
  }
}
