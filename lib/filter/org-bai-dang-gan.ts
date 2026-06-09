import "server-only";

import { MAX_FILTERS_PER_OBJECT } from "@/lib/filter/constants";
import {
  FILTER_LOAI_ORG_BAI_DANG,
  type PersonalFilterRef,
} from "@/lib/filter/types";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

function mapRef(row: FilterRow): PersonalFilterRef {
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
  };
}

function isFilterTableMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("filter_gan") ||
    m.includes("filter_nhan") ||
    m.includes("does not exist") ||
    m.includes("42p01")
  );
}

export async function validateFilterIdsForOrg(
  orgId: string,
  filterIds: string[],
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const unique = [...new Set(filterIds.filter(Boolean))];
  if (unique.length === 0) return { ok: true, ids: [] };
  if (unique.length > MAX_FILTERS_PER_OBJECT) {
    return {
      ok: false,
      error: `Tối đa ${MAX_FILTERS_PER_OBJECT} nhãn mỗi bài đăng.`,
    };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("filter_nhan")
    .select("id")
    .eq("id_to_chuc", orgId)
    .in("id", unique)
    .returns<Array<{ id: string }>>();

  if (error) {
    if (isFilterTableMissingError(error.message)) {
      return { ok: false, error: "Chưa có bảng filter trên database." };
    }
    return { ok: false, error: error.message };
  }

  if ((data?.length ?? 0) !== unique.length) {
    return { ok: false, error: "Một hoặc nhiều nhãn không thuộc trường này." };
  }

  return { ok: true, ids: unique };
}

export async function loadPersonalFiltersForOrgBaiDang(
  postIds: string[],
): Promise<Map<string, PersonalFilterRef[]>> {
  const out = new Map<string, PersonalFilterRef[]>();
  if (postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("filter_gan")
    .select("id_doi_tuong, filter_nhan(id, ten, slug, mau, thu_tu)")
    .eq("loai_doi_tuong", FILTER_LOAI_ORG_BAI_DANG)
    .in("id_doi_tuong", postIds)
    .returns<
      Array<{
        id_doi_tuong: string;
        filter_nhan: FilterRow | null;
      }>
    >();

  if (error) {
    if (isFilterTableMissingError(error.message)) return out;
    throw error;
  }

  for (const row of data ?? []) {
    const filter = row.filter_nhan;
    if (!filter) continue;
    const list = out.get(row.id_doi_tuong) ?? [];
    list.push(mapRef(filter));
    out.set(row.id_doi_tuong, list);
  }

  for (const [, filters] of out) {
    filters.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  }

  return out;
}

export async function setOrgBaiDangPersonalFilters(params: {
  postId: string;
  orgId: string;
  adminId: string;
  filterIds: string[];
}): Promise<
  { ok: true; filters: PersonalFilterRef[] } | { ok: false; error: string }
> {
  if (!(await isTruongOrgAdmin(params.orgId, params.adminId))) {
    return { ok: false, error: "Chỉ quản trị viên trường mới gắn nhãn." };
  }

  const admin = createServiceRoleClient();
  const { data: post } = await admin
    .from("org_bai_dang")
    .select("id")
    .eq("id", params.postId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle();

  if (!post) return { ok: false, error: "Không tìm thấy bài đăng." };

  const validated = await validateFilterIdsForOrg(params.orgId, params.filterIds);
  if (!validated.ok) return validated;

  const currentRows = await admin
    .from("filter_gan")
    .select("id_filter")
    .eq("loai_doi_tuong", FILTER_LOAI_ORG_BAI_DANG)
    .eq("id_doi_tuong", params.postId)
    .returns<Array<{ id_filter: string }>>();

  const current = new Set((currentRows.data ?? []).map((r) => r.id_filter));
  const next = new Set(validated.ids);
  const toDelete = [...current].filter((id) => !next.has(id));
  const toInsert = [...next].filter((id) => !current.has(id));

  if (toDelete.length > 0) {
    const { error } = await admin
      .from("filter_gan")
      .delete()
      .eq("loai_doi_tuong", FILTER_LOAI_ORG_BAI_DANG)
      .eq("id_doi_tuong", params.postId)
      .in("id_filter", toDelete);
    if (error) return { ok: false, error: error.message };
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from("filter_gan").insert(
      toInsert.map((id_filter) => ({
        id_filter,
        loai_doi_tuong: FILTER_LOAI_ORG_BAI_DANG,
        id_doi_tuong: params.postId,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  const map = await loadPersonalFiltersForOrgBaiDang([params.postId]);
  return { ok: true, filters: map.get(params.postId) ?? [] };
}

export async function countOrgBaiDangFiltersForOrg(
  orgId: string,
  filterIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!filterIds.length) return counts;

  const admin = createServiceRoleClient();
  const { data: posts } = await admin
    .from("org_bai_dang")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_dang")
    .returns<Array<{ id: string }>>();

  const postIds = (posts ?? []).map((p) => p.id);
  if (!postIds.length) return counts;

  const { data, error } = await admin
    .from("filter_gan")
    .select("id_filter, id_doi_tuong")
    .eq("loai_doi_tuong", FILTER_LOAI_ORG_BAI_DANG)
    .in("id_filter", filterIds)
    .in("id_doi_tuong", postIds)
    .returns<Array<{ id_filter: string; id_doi_tuong: string }>>();

  if (error) {
    if (isFilterTableMissingError(error.message)) return counts;
    throw error;
  }

  for (const row of data ?? []) {
    counts.set(row.id_filter, (counts.get(row.id_filter) ?? 0) + 1);
  }
  return counts;
}
