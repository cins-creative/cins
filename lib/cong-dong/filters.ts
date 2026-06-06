import "server-only";

import { THAO_LUAN_LOAI_CONTEXT } from "@/lib/cong-dong/constants";
import { ensureDefaultCongDongFilters } from "@/lib/cong-dong/default-filters";
import { isCongDongAdmin } from "@/lib/cong-dong/membership";
import { slugifyOrgName } from "@/lib/cong-dong/org-slug";
import type { CongDongFilter } from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_FILTER_NAME = 40;
const MAX_FILTERS_PER_ORG = 30;
const MAX_FILTERS_PER_POST = 8;
const DEFAULT_MAU = "#1F74C9";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string;
  icon: string | null;
  thu_tu: number;
};

function mapFilter(row: FilterRow): CongDongFilter {
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
    icon: row.icon,
    thuTu: row.thu_tu,
  };
}

function normalizeMau(value: string | undefined): string | null {
  const mau = value?.trim();
  if (!mau) return DEFAULT_MAU;
  if (!/^#[0-9A-Fa-f]{6}$/.test(mau)) return null;
  return mau.toUpperCase();
}

function normalizeSlug(value: string | undefined, ten: string): string {
  const base = value?.trim() ? slugifyOrgName(value) : slugifyOrgName(ten);
  return base.slice(0, 48) || "nhan";
}

export async function listCongDongFilters(orgId: string): Promise<CongDongFilter[]> {
  await ensureDefaultCongDongFilters(orgId);
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_thao_luan_filter")
    .select("id, ten, slug, mau, icon, thu_tu")
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", orgId)
    .order("thu_tu", { ascending: true })
    .order("ten", { ascending: true })
    .returns<FilterRow[]>();

  return (data ?? []).map(mapFilter);
}

export async function resolveFilterIdsBySlugs(
  orgId: string,
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) return [];
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_thao_luan_filter")
    .select("id, slug")
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", orgId)
    .in("slug", slugs)
    .returns<Array<{ id: string; slug: string }>>();

  return (data ?? []).map((r) => r.id);
}

export async function loadFiltersForPosts(
  postIds: string[],
): Promise<Map<string, CongDongFilter[]>> {
  const out = new Map<string, CongDongFilter[]>();
  if (postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_thao_luan_filter_gan")
    .select(
      "id_thao_luan, content_thao_luan_filter(id, ten, slug, mau, icon, thu_tu)",
    )
    .in("id_thao_luan", postIds)
    .returns<
      Array<{
        id_thao_luan: string;
        content_thao_luan_filter: FilterRow | null;
      }>
    >();

  for (const row of data ?? []) {
    const filter = row.content_thao_luan_filter;
    if (!filter) continue;
    const list = out.get(row.id_thao_luan) ?? [];
    list.push(mapFilter(filter));
    out.set(row.id_thao_luan, list);
  }

  for (const [, filters] of out) {
    filters.sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));
  }

  return out;
}

export async function getMatchingPostIdsForFilters(
  filterIds: string[],
): Promise<string[]> {
  if (filterIds.length === 0) return [];
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_thao_luan_filter_gan")
    .select("id_thao_luan")
    .in("id_filter", filterIds)
    .returns<Array<{ id_thao_luan: string }>>();

  return [...new Set((data ?? []).map((r) => r.id_thao_luan))];
}

export async function attachFiltersToPost(
  postId: string,
  filterIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const unique = [...new Set(filterIds)];
  if (unique.length === 0) return { ok: true };
  if (unique.length > MAX_FILTERS_PER_POST) {
    return { ok: false, error: `Tối đa ${MAX_FILTERS_PER_POST} nhãn mỗi bài.` };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.from("content_thao_luan_filter_gan").insert(
    unique.map((id_filter) => ({
      id_thao_luan: postId,
      id_filter,
    })),
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function validateFilterIdsForOrg(
  orgId: string,
  filterIds: string[],
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const unique = [...new Set(filterIds.filter(Boolean))];
  if (unique.length === 0) return { ok: true, ids: [] };
  if (unique.length > MAX_FILTERS_PER_POST) {
    return { ok: false, error: `Tối đa ${MAX_FILTERS_PER_POST} nhãn mỗi bài.` };
  }

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_thao_luan_filter")
    .select("id")
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", orgId)
    .in("id", unique)
    .returns<Array<{ id: string }>>();

  if ((data?.length ?? 0) !== unique.length) {
    return { ok: false, error: "Một hoặc nhiều nhãn không thuộc cộng đồng này." };
  }

  return { ok: true, ids: unique };
}

export async function createCongDongFilter(params: {
  orgId: string;
  adminId: string;
  ten: string;
  slug?: string;
  mau?: string;
  thuTu?: number;
  icon?: string;
}): Promise<
  | { ok: true; data: CongDongFilter }
  | { ok: false; error: string }
> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return { ok: false, error: "Chỉ admin cộng đồng mới quản lý nhãn." };
  }

  const ten = params.ten?.trim();
  if (!ten) return { ok: false, error: "Tên nhãn trống." };
  if (ten.length > MAX_FILTER_NAME) {
    return { ok: false, error: `Tên nhãn tối đa ${MAX_FILTER_NAME} ký tự.` };
  }

  const mau = normalizeMau(params.mau);
  if (!mau) return { ok: false, error: "Màu nhãn không hợp lệ (#RRGGBB)." };

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("content_thao_luan_filter")
    .select("id", { count: "exact", head: true })
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", params.orgId);

  if ((count ?? 0) >= MAX_FILTERS_PER_ORG) {
    return { ok: false, error: `Tối đa ${MAX_FILTERS_PER_ORG} nhãn mỗi cộng đồng.` };
  }

  let slug = normalizeSlug(params.slug, ten);
  const { data: slugConflict } = await admin
    .from("content_thao_luan_filter")
    .select("id")
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", params.orgId)
    .eq("slug", slug)
    .maybeSingle();

  if (slugConflict) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const { data: inserted, error } = await admin
    .from("content_thao_luan_filter")
    .insert({
      loai_context: THAO_LUAN_LOAI_CONTEXT.CONG_DONG,
      id_context: params.orgId,
      ten,
      slug,
      mau,
      icon: params.icon?.trim() || null,
      thu_tu: params.thuTu ?? (count ?? 0),
    })
    .select("id, ten, slug, mau, icon, thu_tu")
    .single<FilterRow>();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Không tạo được nhãn." };
  }

  return { ok: true, data: mapFilter(inserted) };
}

export async function updateCongDongFilter(params: {
  orgId: string;
  filterId: string;
  adminId: string;
  ten?: string;
  slug?: string;
  mau?: string;
  thuTu?: number;
}): Promise<
  | { ok: true; data: CongDongFilter }
  | { ok: false; error: string }
> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return { ok: false, error: "Chỉ admin cộng đồng mới quản lý nhãn." };
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("content_thao_luan_filter")
    .select("id, ten, slug, mau, icon, thu_tu")
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", params.orgId)
    .eq("id", params.filterId)
    .maybeSingle<FilterRow>();

  if (!existing) return { ok: false, error: "Không tìm thấy nhãn." };

  const patch: Partial<{
    ten: string;
    slug: string;
    mau: string;
    thu_tu: number;
  }> = {};

  if (params.ten !== undefined) {
    const ten = params.ten.trim();
    if (!ten) return { ok: false, error: "Tên nhãn trống." };
    if (ten.length > MAX_FILTER_NAME) {
      return { ok: false, error: `Tên nhãn tối đa ${MAX_FILTER_NAME} ký tự.` };
    }
    patch.ten = ten;
  }

  if (params.slug !== undefined) {
    const slug = normalizeSlug(params.slug, patch.ten ?? existing.ten);
    const { data: conflict } = await admin
      .from("content_thao_luan_filter")
      .select("id")
      .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
      .eq("id_context", params.orgId)
      .eq("slug", slug)
      .neq("id", params.filterId)
      .maybeSingle();
    if (conflict) return { ok: false, error: "Slug nhãn đã tồn tại." };
    patch.slug = slug;
  }

  if (params.mau !== undefined) {
    const mau = normalizeMau(params.mau);
    if (!mau) return { ok: false, error: "Màu nhãn không hợp lệ (#RRGGBB)." };
    patch.mau = mau;
  }

  if (params.thuTu !== undefined) {
    patch.thu_tu = params.thuTu;
  }

  const { data: updated, error } = await admin
    .from("content_thao_luan_filter")
    .update(patch)
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", params.orgId)
    .eq("id", params.filterId)
    .select("id, ten, slug, mau, icon, thu_tu")
    .single<FilterRow>();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Không cập nhật được nhãn." };
  }

  return { ok: true, data: mapFilter(updated) };
}

export async function deleteCongDongFilter(params: {
  orgId: string;
  filterId: string;
  adminId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return { ok: false, error: "Chỉ admin cộng đồng mới quản lý nhãn." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_thao_luan_filter")
    .delete()
    .eq("loai_context", THAO_LUAN_LOAI_CONTEXT.CONG_DONG)
    .eq("id_context", params.orgId)
    .eq("id", params.filterId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
