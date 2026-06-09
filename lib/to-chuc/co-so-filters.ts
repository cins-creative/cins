import "server-only";

import { slugifyOrgName } from "@/lib/cong-dong/org-slug";
import { DEFAULT_FILTER_MAU, MAX_FILTER_NAME } from "@/lib/filter/constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { isCoSoOrgAdmin } from "./co-so-membership";

const MAX_FILTERS_PER_ORG = 12;

export type CoSoOrgFilter = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thuTu: number;
};

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

function mapFilter(row: FilterRow): CoSoOrgFilter {
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
    thuTu: row.thu_tu,
  };
}

function normalizeMau(value: string | undefined): string | null {
  const mau = value?.trim();
  if (!mau) return DEFAULT_FILTER_MAU;
  if (!/^#[0-9A-Fa-f]{6}$/.test(mau)) return null;
  return mau.toUpperCase();
}

function normalizeSlug(value: string | undefined, ten: string): string {
  const base = value?.trim() ? slugifyOrgName(value) : slugifyOrgName(ten);
  return base.slice(0, 48) || "nhan";
}

async function uniqueFilterSlugForOrg(orgId: string, baseSlug: string): Promise<string> {
  const admin = createServiceRoleClient();
  let candidate = baseSlug.slice(0, 48);
  let n = 2;
  while (n < 100) {
    const { data } = await admin
      .from("filter_nhan")
      .select("id")
      .eq("id_to_chuc", orgId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    const suffix = `-${n}`;
    candidate = baseSlug.slice(0, 48 - suffix.length) + suffix;
    n += 1;
  }
  return `${baseSlug.slice(0, 40)}-${Date.now().toString(36)}`;
}

export async function listCoSoOrgFilters(orgId: string): Promise<CoSoOrgFilter[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("filter_nhan")
    .select("id, ten, slug, mau, thu_tu")
    .eq("id_to_chuc", orgId)
    .order("thu_tu", { ascending: true })
    .returns<FilterRow[]>();

  return (data ?? []).map(mapFilter);
}

export async function createCoSoOrgFilter(params: {
  orgId: string;
  adminId: string;
  ten: string;
  mau?: string;
  thuTu?: number;
}): Promise<{ ok: true; filter: CoSoOrgFilter } | { ok: false; error: string }> {
  if (!(await isCoSoOrgAdmin(params.orgId, params.adminId))) {
    return { ok: false, error: "Chỉ admin cơ sở mới quản lý nhãn." };
  }

  const ten = params.ten.trim();
  if (!ten) return { ok: false, error: "Tên nhãn không được trống." };
  if (ten.length > MAX_FILTER_NAME) {
    return { ok: false, error: `Tên nhãn tối đa ${MAX_FILTER_NAME} ký tự.` };
  }

  const mau = normalizeMau(params.mau);
  if (!mau) return { ok: false, error: "Màu nhãn không hợp lệ (#RRGGBB)." };

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("filter_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", params.orgId);

  if ((count ?? 0) >= MAX_FILTERS_PER_ORG) {
    return { ok: false, error: `Tối đa ${MAX_FILTERS_PER_ORG} nhãn mỗi cơ sở.` };
  }

  const slug = await uniqueFilterSlugForOrg(params.orgId, normalizeSlug(undefined, ten));

  const { data, error } = await admin
    .from("filter_nhan")
    .insert({
      id_to_chuc: params.orgId,
      id_nguoi_dung: null,
      ten,
      slug,
      mau,
      thu_tu: params.thuTu ?? (count ?? 0),
    })
    .select("id, ten, slug, mau, thu_tu")
    .single<FilterRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo được nhãn." };
  }

  return { ok: true, filter: mapFilter(data) };
}

export async function updateCoSoOrgFilter(params: {
  orgId: string;
  filterId: string;
  adminId: string;
  ten?: string;
  mau?: string;
  thuTu?: number;
}): Promise<{ ok: true; filter: CoSoOrgFilter } | { ok: false; error: string }> {
  if (!(await isCoSoOrgAdmin(params.orgId, params.adminId))) {
    return { ok: false, error: "Chỉ admin cơ sở mới quản lý nhãn." };
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("filter_nhan")
    .select("id")
    .eq("id", params.filterId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Không tìm thấy nhãn." };

  const patch: Record<string, unknown> = {};
  if (params.ten !== undefined) {
    const ten = params.ten.trim();
    if (!ten) return { ok: false, error: "Tên nhãn không được trống." };
    if (ten.length > MAX_FILTER_NAME) {
      return { ok: false, error: `Tên nhãn tối đa ${MAX_FILTER_NAME} ký tự.` };
    }
    patch.ten = ten;
  }
  if (params.mau !== undefined) {
    const mau = normalizeMau(params.mau);
    if (!mau) return { ok: false, error: "Màu nhãn không hợp lệ (#RRGGBB)." };
    patch.mau = mau;
  }
  if (params.thuTu !== undefined) patch.thu_tu = params.thuTu;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Không có thay đổi." };
  }

  const { data, error } = await admin
    .from("filter_nhan")
    .update(patch)
    .eq("id", params.filterId)
    .eq("id_to_chuc", params.orgId)
    .select("id, ten, slug, mau, thu_tu")
    .single<FilterRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật được nhãn." };
  }

  return { ok: true, filter: mapFilter(data) };
}

export async function deleteCoSoOrgFilter(params: {
  orgId: string;
  filterId: string;
  adminId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isCoSoOrgAdmin(params.orgId, params.adminId))) {
    return { ok: false, error: "Chỉ admin cơ sở mới quản lý nhãn." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("filter_nhan")
    .delete()
    .eq("id", params.filterId)
    .eq("id_to_chuc", params.orgId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
