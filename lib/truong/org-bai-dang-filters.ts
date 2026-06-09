import "server-only";

import { slugifyOrgName } from "@/lib/cong-dong/org-slug";
import { DEFAULT_FILTER_MAU, MAX_FILTER_NAME } from "@/lib/filter/constants";
import { BAI_DANG_LOAI_VALUES } from "@/lib/truong/bai-dang";
import { MAX_TRUONG_ORG_BAI_DANG_FILTERS } from "@/lib/truong/org-bai-dang-filters.shared";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Slug loại bài đăng mặc định — không dùng cho nhãn tùy chỉnh. */
export const BAI_DANG_RESERVED_FILTER_SLUGS = new Set<string>([
  "all",
  ...BAI_DANG_LOAI_VALUES,
]);

export type TruongOrgFilterChip = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thuTu: number;
  count?: number;
};

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

function mapFilter(row: FilterRow, count?: number): TruongOrgFilterChip {
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
    thuTu: row.thu_tu,
    count,
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

function isFilterTableMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("filter_nhan") || m.includes("does not exist") || m.includes("42p01");
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

export async function listTruongOrgFilters(orgId: string): Promise<TruongOrgFilterChip[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("filter_nhan")
    .select("id, ten, slug, mau, thu_tu")
    .eq("id_to_chuc", orgId)
    .order("thu_tu", { ascending: true })
    .returns<FilterRow[]>();

  if (error) {
    if (isFilterTableMissingError(error.message)) return [];
    throw error;
  }

  return (data ?? []).map((row) => mapFilter(row));
}

export async function createTruongOrgFilter(params: {
  orgId: string;
  adminId: string;
  ten: string;
  mau?: string;
  thuTu?: number;
}): Promise<{ ok: true; filter: TruongOrgFilterChip } | { ok: false; error: string }> {
  if (!(await isTruongOrgAdmin(params.orgId, params.adminId))) {
    return { ok: false, error: "Chỉ quản trị viên trường mới quản lý nhãn." };
  }

  const ten = params.ten.trim();
  if (!ten) return { ok: false, error: "Tên nhãn không được trống." };
  if (ten.length > MAX_FILTER_NAME) {
    return { ok: false, error: `Tên nhãn tối đa ${MAX_FILTER_NAME} ký tự.` };
  }

  const mau = normalizeMau(params.mau);
  if (!mau) return { ok: false, error: "Màu nhãn không hợp lệ (#RRGGBB)." };

  const baseSlug = normalizeSlug(undefined, ten);
  if (BAI_DANG_RESERVED_FILTER_SLUGS.has(baseSlug)) {
    return { ok: false, error: "Slug trùng loại bài đăng mặc định." };
  }

  const admin = createServiceRoleClient();
  const { count, error: countError } = await admin
    .from("filter_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", params.orgId);

  if (countError) {
    if (isFilterTableMissingError(countError.message)) {
      return { ok: false, error: "Chưa có bảng filter — chạy migration_filter_dong.sql." };
    }
    return { ok: false, error: countError.message };
  }

  if ((count ?? 0) >= MAX_TRUONG_ORG_BAI_DANG_FILTERS) {
    return {
      ok: false,
      error: `Tối đa ${MAX_TRUONG_ORG_BAI_DANG_FILTERS} nhãn tùy chỉnh.`,
    };
  }

  const slug = await uniqueFilterSlugForOrg(params.orgId, baseSlug);
  if (BAI_DANG_RESERVED_FILTER_SLUGS.has(slug)) {
    return { ok: false, error: "Slug trùng loại bài đăng mặc định." };
  }

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

export async function deleteTruongOrgFilter(params: {
  orgId: string;
  filterId: string;
  adminId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isTruongOrgAdmin(params.orgId, params.adminId))) {
    return { ok: false, error: "Chỉ quản trị viên trường mới quản lý nhãn." };
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
