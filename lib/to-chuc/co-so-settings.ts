import "server-only";

import {
  isOrgSlugTaken,
  validateOrgSlug,
} from "@/lib/cong-dong/org-slug";
import { LOAI_CO_SO_SET } from "@/lib/to-chuc/constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { listCoSoOrgFilters, type CoSoOrgFilter } from "./co-so-filters";
import { isCoSoOrgAdmin } from "./co-so-membership";
import {
  mergeCoSoPageCauHinh,
  parseCoSoPageCauHinh,
  type CoSoPageCauHinh,
} from "./co-so-page-cau-hinh";

export type CoSoSettingsPayload = {
  orgId: string;
  slug: string;
  ten: string;
  moTa: string | null;
  gioiThieuTruong: string | null;
  tenChinhThuc: string;
  loaiCoSo: string;
  namThanhLap: number | null;
  website: string | null;
  giayPhepDaoTao: string | null;
  maCoSo: string;
  daVerify: boolean;
  pageConfig: CoSoPageCauHinh;
  filters: CoSoOrgFilter[];
};

type OrgRow = {
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
  gioi_thieu_truong: string | null;
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

function parseNamThanhLap(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1800 || n > 2100) return "invalid";
  return n;
}

async function loadCoSoOrg(orgId: string): Promise<OrgRow | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, gioi_thieu_truong, cau_hinh, org_co_so_dao_tao(ma_co_so, ten_chinh_thuc, loai_co_so, nam_thanh_lap, website, giay_phep_dao_tao, da_verify)",
    )
    .eq("id", orgId)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle<OrgRow>();

  if (!data?.org_co_so_dao_tao) return null;
  return data;
}

function mapSettings(org: OrgRow, filters: CoSoOrgFilter[]): CoSoSettingsPayload {
  const ext = org.org_co_so_dao_tao!;
  return {
    orgId: org.id,
    slug: org.slug,
    ten: org.ten,
    moTa: org.mo_ta,
    gioiThieuTruong: org.gioi_thieu_truong,
    tenChinhThuc: ext.ten_chinh_thuc,
    loaiCoSo: ext.loai_co_so,
    namThanhLap: ext.nam_thanh_lap,
    website: ext.website,
    giayPhepDaoTao: ext.giay_phep_dao_tao,
    maCoSo: ext.ma_co_so,
    daVerify: ext.da_verify,
    pageConfig: parseCoSoPageCauHinh(org.cau_hinh),
    filters,
  };
}

export async function getCoSoSettings(
  orgId: string,
  profileId: string,
): Promise<
  { ok: true; settings: CoSoSettingsPayload } | { ok: false; error: string }
> {
  if (!(await isCoSoOrgAdmin(orgId, profileId))) {
    return { ok: false, error: "Bạn không có quyền quản trị cơ sở này." };
  }

  const org = await loadCoSoOrg(orgId);
  if (!org) return { ok: false, error: "Không tìm thấy cơ sở." };

  const filters = await listCoSoOrgFilters(orgId);
  return { ok: true, settings: mapSettings(org, filters) };
}

export type UpdateCoSoSettingsInput = {
  ten?: string;
  slug?: string;
  moTa?: string | null;
  gioiThieuTruong?: string | null;
  tenChinhThuc?: string;
  loaiCoSo?: string;
  namThanhLap?: number | null;
  website?: string | null;
  giayPhepDaoTao?: string | null;
  pageConfig?: CoSoPageCauHinh;
};

export async function updateCoSoSettings(
  orgId: string,
  profileId: string,
  input: UpdateCoSoSettingsInput,
): Promise<
  { ok: true; settings: CoSoSettingsPayload } | { ok: false; error: string }
> {
  if (!(await isCoSoOrgAdmin(orgId, profileId))) {
    return { ok: false, error: "Bạn không có quyền quản trị cơ sở này." };
  }

  const org = await loadCoSoOrg(orgId);
  if (!org) return { ok: false, error: "Không tìm thấy cơ sở." };

  const orgPatch: Record<string, unknown> = {};
  const extPatch: Record<string, unknown> = {};

  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Tên hiển thị không được trống." };
    if (ten.length > 120) {
      return { ok: false, error: "Tên hiển thị tối đa 120 ký tự." };
    }
    orgPatch.ten = ten;
  }

  if (input.slug !== undefined) {
    const validation = validateOrgSlug(input.slug);
    if (!validation.ok) return { ok: false, error: validation.error };
    if (validation.slug !== org.slug && (await isOrgSlugTaken(validation.slug))) {
      return { ok: false, error: "Đường dẫn này đã có người dùng." };
    }
    orgPatch.slug = validation.slug;
  }

  if (input.moTa !== undefined) {
    orgPatch.mo_ta = input.moTa?.trim() || null;
  }

  if (input.gioiThieuTruong !== undefined) {
    orgPatch.gioi_thieu_truong = input.gioiThieuTruong?.trim() || null;
  }

  if (input.pageConfig !== undefined) {
    orgPatch.cau_hinh = mergeCoSoPageCauHinh(org.cau_hinh, input.pageConfig);
  }

  if (input.tenChinhThuc !== undefined) {
    const tenChinhThuc = input.tenChinhThuc.trim();
    if (!tenChinhThuc) {
      return { ok: false, error: "Tên pháp lý không được trống." };
    }
    extPatch.ten_chinh_thuc = tenChinhThuc;
  }

  if (input.loaiCoSo !== undefined) {
    if (!LOAI_CO_SO_SET.has(input.loaiCoSo)) {
      return { ok: false, error: "Loại cơ sở không hợp lệ." };
    }
    extPatch.loai_co_so = input.loaiCoSo;
  }

  if (input.namThanhLap !== undefined) {
    if (input.namThanhLap === null) {
      extPatch.nam_thanh_lap = null;
    } else {
      const parsed = parseNamThanhLap(input.namThanhLap);
      if (parsed === "invalid") {
        return { ok: false, error: "Năm thành lập không hợp lệ (1800–2100)." };
      }
      extPatch.nam_thanh_lap = parsed;
    }
  }

  if (input.website !== undefined) {
    extPatch.website = input.website?.trim() || null;
  }

  if (input.giayPhepDaoTao !== undefined) {
    extPatch.giay_phep_dao_tao = input.giayPhepDaoTao?.trim() || null;
  }

  if (Object.keys(orgPatch).length === 0 && Object.keys(extPatch).length === 0) {
    return { ok: false, error: "Không có thay đổi." };
  }

  const admin = createServiceRoleClient();

  if (Object.keys(orgPatch).length > 0) {
    const { error } = await admin.from("org_to_chuc").update(orgPatch).eq("id", orgId);
    if (error) return { ok: false, error: error.message };
  }

  if (Object.keys(extPatch).length > 0) {
    const { error } = await admin
      .from("org_co_so_dao_tao")
      .update(extPatch)
      .eq("id_to_chuc", orgId);
    if (error) return { ok: false, error: error.message };
  }

  const refreshed = await loadCoSoOrg(orgId);
  if (!refreshed) return { ok: false, error: "Không tải lại được cơ sở." };

  const filters = await listCoSoOrgFilters(orgId);
  return { ok: true, settings: mapSettings(refreshed, filters) };
}
