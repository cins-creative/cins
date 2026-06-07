import "server-only";

import { MAX_FILTERS_PER_OBJECT } from "@/lib/filter/constants";
import {
  FILTER_LOAI_COT_MOC,
  type PersonalFilterRef,
} from "@/lib/filter/types";
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

export async function assertCotMocOwnedByUser(
  milestoneId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", milestoneId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (!data) return { ok: false, error: "Không tìm thấy cột mốc." };
  if (data.id_nguoi_dung !== userId) {
    return { ok: false, error: "Bạn không có quyền gắn nhãn lên cột mốc này." };
  }
  return { ok: true };
}

export async function validateFilterIdsForUser(
  userId: string,
  filterIds: string[],
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const unique = [...new Set(filterIds.filter(Boolean))];
  if (unique.length === 0) return { ok: true, ids: [] };
  if (unique.length > MAX_FILTERS_PER_OBJECT) {
    return {
      ok: false,
      error: `Tối đa ${MAX_FILTERS_PER_OBJECT} nhãn mỗi cột mốc.`,
    };
  }

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("filter_nhan")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .in("id", unique)
    .returns<Array<{ id: string }>>();

  if ((data?.length ?? 0) !== unique.length) {
    return { ok: false, error: "Một hoặc nhiều nhãn không thuộc tài khoản của bạn." };
  }

  return { ok: true, ids: unique };
}

export async function setMilestonePersonalFilters(params: {
  milestoneId: string;
  userId: string;
  filterIds: string[];
}): Promise<{ ok: true; filters: PersonalFilterRef[] } | { ok: false; error: string }> {
  const owned = await assertCotMocOwnedByUser(params.milestoneId, params.userId);
  if (!owned.ok) return owned;

  const validated = await validateFilterIdsForUser(params.userId, params.filterIds);
  if (!validated.ok) return validated;

  const admin = createServiceRoleClient();

  const { data: currentRows } = await admin
    .from("filter_gan")
    .select("id_filter")
    .eq("loai_doi_tuong", FILTER_LOAI_COT_MOC)
    .eq("id_doi_tuong", params.milestoneId)
    .returns<Array<{ id_filter: string }>>();

  const current = new Set((currentRows ?? []).map((r) => r.id_filter));
  const next = new Set(validated.ids);
  const toDelete = [...current].filter((id) => !next.has(id));
  const toInsert = [...next].filter((id) => !current.has(id));

  if (toDelete.length > 0) {
    const { error } = await admin
      .from("filter_gan")
      .delete()
      .eq("loai_doi_tuong", FILTER_LOAI_COT_MOC)
      .eq("id_doi_tuong", params.milestoneId)
      .in("id_filter", toDelete);
    if (error) return { ok: false, error: error.message };
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from("filter_gan").insert(
      toInsert.map((id_filter) => ({
        id_filter,
        loai_doi_tuong: FILTER_LOAI_COT_MOC,
        id_doi_tuong: params.milestoneId,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  const filters = await loadPersonalFilterRefsForCotMoc(params.milestoneId);
  return { ok: true, filters };
}

export async function loadPersonalFilterRefsForCotMoc(
  cotMocId: string,
): Promise<PersonalFilterRef[]> {
  const map = await loadPersonalFiltersForCotMocs([cotMocId]);
  return map.get(cotMocId) ?? [];
}

export async function loadPersonalFilterIdsForCotMoc(
  cotMocId: string,
): Promise<string[]> {
  const refs = await loadPersonalFilterRefsForCotMoc(cotMocId);
  return refs.map((f) => f.id);
}

export async function loadPersonalFiltersForCotMocs(
  cotMocIds: string[],
): Promise<Map<string, PersonalFilterRef[]>> {
  const out = new Map<string, PersonalFilterRef[]>();
  if (cotMocIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("filter_gan")
    .select("id_doi_tuong, filter_nhan(id, ten, slug, mau, thu_tu)")
    .eq("loai_doi_tuong", FILTER_LOAI_COT_MOC)
    .in("id_doi_tuong", cotMocIds)
    .returns<
      Array<{
        id_doi_tuong: string;
        filter_nhan: FilterRow | null;
      }>
    >();

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

export async function loadPersonalFilterSlugsForCotMocs(
  cotMocIds: string[],
): Promise<Map<string, string[]>> {
  const refs = await loadPersonalFiltersForCotMocs(cotMocIds);
  const out = new Map<string, string[]>();
  for (const [id, filters] of refs) {
    out.set(
      id,
      filters.map((f) => f.slug),
    );
  }
  return out;
}

export async function countFiltersForUser(userId: string): Promise<Map<string, number>> {
  const admin = createServiceRoleClient();
  const { data: filters } = await admin
    .from("filter_nhan")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .returns<Array<{ id: string }>>();

  const filterIds = (filters ?? []).map((f) => f.id);
  if (filterIds.length === 0) return new Map();

  const { data: ganRows } = await admin
    .from("filter_gan")
    .select("id_filter")
    .eq("loai_doi_tuong", FILTER_LOAI_COT_MOC)
    .in("id_filter", filterIds)
    .returns<Array<{ id_filter: string }>>();

  const counts = new Map<string, number>();
  for (const row of ganRows ?? []) {
    counts.set(row.id_filter, (counts.get(row.id_filter) ?? 0) + 1);
  }
  return counts;
}
