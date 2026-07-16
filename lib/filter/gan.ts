import "server-only";

import { MAX_FILTERS_PER_OBJECT } from "@/lib/filter/constants";
import {
  FILTER_LOAI_COT_MOC,
  FILTER_LOAI_ORG_BAI_DANG,
  type FilterLoaiDoiTuong,
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
  loaiDoiTuong?: FilterLoaiDoiTuong;
}): Promise<{ ok: true; filters: PersonalFilterRef[] } | { ok: false; error: string }> {
  return setUserObjectPersonalFilters({
    userId: params.userId,
    loaiDoiTuong: params.loaiDoiTuong ?? FILTER_LOAI_COT_MOC,
    objectId: params.milestoneId,
    filterIds: params.filterIds,
  });
}

export async function assertCanAttachUserPersonalFilter(params: {
  userId: string;
  loaiDoiTuong: FilterLoaiDoiTuong;
  objectId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  if (params.loaiDoiTuong === FILTER_LOAI_COT_MOC) {
    const owned = await assertCotMocOwnedByUser(params.objectId, params.userId);
    if (owned.ok) return owned;

    const { data: bookmark } = await admin
      .from("social_luu")
      .select("id_doi_tuong")
      .eq("id_nguoi_dung", params.userId)
      .eq("loai_doi_tuong", "cot_moc")
      .eq("id_doi_tuong", params.objectId)
      .maybeSingle<{ id_doi_tuong: string }>();
    if (bookmark) return { ok: true };

    const { data: links } = await admin
      .from("content_tac_pham_thuoc_moc")
      .select("id_tac_pham")
      .eq("id_cot_moc", params.objectId)
      .returns<Array<{ id_tac_pham: string }>>();
    const tacPhamIds = (links ?? []).map((l) => l.id_tac_pham).filter(Boolean);
    if (tacPhamIds.length === 0) {
      return { ok: false, error: "Bạn không có quyền gắn nhãn lên cột mốc này." };
    }

    const { data: coRow } = await admin
      .from("content_tac_pham_tac_gia")
      .select("id_tac_pham")
      .in("id_tac_pham", tacPhamIds)
      .eq("id_nguoi_dung", params.userId)
      .eq("trang_thai", "accepted")
      .limit(1)
      .maybeSingle<{ id_tac_pham: string }>();
    if (coRow) return { ok: true };

    return { ok: false, error: "Bạn không có quyền gắn nhãn lên cột mốc này." };
  }

  const { data: tagRow } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_bai_dang")
    .eq("id_bai_dang", params.objectId)
    .eq("id_nguoi_dung", params.userId)
    .eq("trang_thai", "accepted")
    .maybeSingle<{ id_bai_dang: string }>();
  if (!tagRow) {
    return { ok: false, error: "Bạn không có quyền gắn nhãn lên bài này." };
  }
  return { ok: true };
}

async function loadUserFilterIds(userId: string): Promise<Set<string>> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("filter_nhan")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .returns<Array<{ id: string }>>();
  return new Set((data ?? []).map((row) => row.id));
}

export async function setUserObjectPersonalFilters(params: {
  userId: string;
  loaiDoiTuong: FilterLoaiDoiTuong;
  objectId: string;
  filterIds: string[];
}): Promise<{ ok: true; filters: PersonalFilterRef[] } | { ok: false; error: string }> {
  const access = await assertCanAttachUserPersonalFilter({
    userId: params.userId,
    loaiDoiTuong: params.loaiDoiTuong,
    objectId: params.objectId,
  });
  if (!access.ok) return access;

  const validated = await validateFilterIdsForUser(params.userId, params.filterIds);
  if (!validated.ok) return validated;

  const admin = createServiceRoleClient();
  const userFilterIds = await loadUserFilterIds(params.userId);

  const { data: currentRows } = await admin
    .from("filter_gan")
    .select("id_filter")
    .eq("loai_doi_tuong", params.loaiDoiTuong)
    .eq("id_doi_tuong", params.objectId)
    .in("id_filter", [...userFilterIds])
    .returns<Array<{ id_filter: string }>>();

  const current = new Set((currentRows ?? []).map((r) => r.id_filter));
  const next = new Set(validated.ids);
  const toDelete = [...current].filter((id) => !next.has(id));
  const toInsert = [...next].filter((id) => !current.has(id));

  if (toDelete.length > 0) {
    const { error } = await admin
      .from("filter_gan")
      .delete()
      .eq("loai_doi_tuong", params.loaiDoiTuong)
      .eq("id_doi_tuong", params.objectId)
      .in("id_filter", toDelete);
    if (error) return { ok: false, error: error.message };
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from("filter_gan").insert(
      toInsert.map((id_filter) => ({
        id_filter,
        loai_doi_tuong: params.loaiDoiTuong,
        id_doi_tuong: params.objectId,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  const filters = await loadPersonalFilterRefsForObject({
    userId: params.userId,
    loaiDoiTuong: params.loaiDoiTuong,
    objectId: params.objectId,
  });
  return { ok: true, filters };
}

export async function loadPersonalFilterRefsForObject(params: {
  userId: string;
  loaiDoiTuong: FilterLoaiDoiTuong;
  objectId: string;
}): Promise<PersonalFilterRef[]> {
  const map = await loadPersonalFiltersForObjects(params.userId, [
    { loaiDoiTuong: params.loaiDoiTuong, objectId: params.objectId },
  ]);
  return map.get(params.objectId) ?? [];
}

export async function loadPersonalFilterRefsForCotMoc(
  cotMocId: string,
  userId?: string | null,
): Promise<PersonalFilterRef[]> {
  const map = await loadPersonalFiltersForCotMocs([cotMocId], userId);
  return map.get(cotMocId) ?? [];
}

export async function loadPersonalFilterIdsForCotMoc(
  cotMocId: string,
  userId?: string | null,
): Promise<string[]> {
  const refs = await loadPersonalFilterRefsForCotMoc(cotMocId, userId);
  return refs.map((f) => f.id);
}

export async function loadPersonalFiltersForObjects(
  userId: string,
  objects: ReadonlyArray<{ loaiDoiTuong: FilterLoaiDoiTuong; objectId: string }>,
): Promise<Map<string, PersonalFilterRef[]>> {
  const out = new Map<string, PersonalFilterRef[]>();
  if (objects.length === 0) return out;

  const cotMocIds = objects
    .filter((o) => o.loaiDoiTuong === FILTER_LOAI_COT_MOC)
    .map((o) => o.objectId);
  const orgPostIds = objects
    .filter((o) => o.loaiDoiTuong === FILTER_LOAI_ORG_BAI_DANG)
    .map((o) => o.objectId);

  const [cotMap, orgMap] = await Promise.all([
    loadPersonalFiltersForCotMocs(cotMocIds, userId),
    loadPersonalFiltersForOrgBaiDangPosts(orgPostIds, userId),
  ]);

  for (const object of objects) {
    const refs =
      object.loaiDoiTuong === FILTER_LOAI_ORG_BAI_DANG
        ? (orgMap.get(object.objectId) ?? [])
        : (cotMap.get(object.objectId) ?? []);
    out.set(object.objectId, refs);
  }
  return out;
}

export async function loadPersonalFiltersForCotMocs(
  cotMocIds: string[],
  userId?: string | null,
): Promise<Map<string, PersonalFilterRef[]>> {
  const out = new Map<string, PersonalFilterRef[]>();
  if (cotMocIds.length === 0) return out;

  const admin = createServiceRoleClient();
  let query = admin
    .from("filter_gan")
    .select("id_doi_tuong, filter_nhan!inner(id, ten, slug, mau, thu_tu, id_nguoi_dung)")
    .eq("loai_doi_tuong", FILTER_LOAI_COT_MOC)
    .in("id_doi_tuong", cotMocIds);

  if (userId) {
    query = query.eq("filter_nhan.id_nguoi_dung", userId);
  }

  const { data } = await query.returns<
    Array<{
      id_doi_tuong: string;
      filter_nhan: (FilterRow & { id_nguoi_dung: string }) | null;
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

export async function loadPersonalFiltersForOrgBaiDangPosts(
  postIds: string[],
  userId: string,
): Promise<Map<string, PersonalFilterRef[]>> {
  const out = new Map<string, PersonalFilterRef[]>();
  if (postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("filter_gan")
    .select("id_doi_tuong, filter_nhan!inner(id, ten, slug, mau, thu_tu, id_nguoi_dung)")
    .eq("loai_doi_tuong", FILTER_LOAI_ORG_BAI_DANG)
    .in("id_doi_tuong", postIds)
    .eq("filter_nhan.id_nguoi_dung", userId)
    .returns<
      Array<{
        id_doi_tuong: string;
        filter_nhan: (FilterRow & { id_nguoi_dung: string }) | null;
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
  userId?: string | null,
): Promise<Map<string, string[]>> {
  const refs = await loadPersonalFiltersForCotMocs(cotMocIds, userId);
  const out = new Map<string, string[]>();
  for (const [id, filters] of refs) {
    out.set(
      id,
      filters.map((f) => f.slug),
    );
  }
  return out;
}

export async function loadPersonalFilterSlugsForJourneyStubs(
  userId: string,
  stubs: ReadonlyArray<{ cotMocId: string; variant?: string; source?: string }>,
  orgVerifiedPostIds: ReadonlySet<string>,
): Promise<Map<string, string[]>> {
  const cotMocIds = stubs
    .filter((stub) => !orgVerifiedPostIds.has(stub.cotMocId))
    .map((stub) => stub.cotMocId);
  const orgPostIds = [...orgVerifiedPostIds];

  const [cotMap, orgMap] = await Promise.all([
    loadPersonalFilterSlugsForCotMocs(cotMocIds, userId),
    orgPostIds.length > 0
      ? loadPersonalFiltersForOrgBaiDangPosts(orgPostIds, userId).then((map) => {
          const slugMap = new Map<string, string[]>();
          for (const [id, filters] of map) {
            slugMap.set(
              id,
              filters.map((f) => f.slug),
            );
          }
          return slugMap;
        })
      : Promise.resolve(new Map<string, string[]>()),
  ]);

  const out = new Map<string, string[]>();
  for (const stub of stubs) {
    const slugs = orgVerifiedPostIds.has(stub.cotMocId)
      ? (orgMap.get(stub.cotMocId) ?? [])
      : (cotMap.get(stub.cotMocId) ?? []);
    out.set(stub.cotMocId, slugs);
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
