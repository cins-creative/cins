import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createTag } from "@/lib/tag/create";

export type TruongNganhMonItem = {
  id: string;
  monHocId: string;
  label: string;
  slug: string;
  thuTu: number;
  /** true = không mở cho gắn đồ án mới; giữ lịch sử. */
  ngungDay: boolean;
  /** Cột `article_bai_viet.thumbnail` — ưu tiên hiển thị như AdminArticleThumb. */
  thumbnail: string | null;
  coverId: string | null;
};

export type TruongMonHocCatalogItem = {
  id: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  coverId: string | null;
};

const MON_HOC_CATALOG_LIMIT = 500;

type LinkRow = {
  id: string;
  id_mon_hoc: string;
  thu_tu: number;
  ngung_day: boolean | null;
  article_bai_viet: {
    id: string;
    slug: string;
    tieu_de: string | null;
    tieu_de_viet: string | null;
    loai_bai_viet: string;
    thumbnail: string | null;
    cover_id: string | null;
  } | null;
};

function pickArticle(
  raw: LinkRow["article_bai_viet"] | LinkRow["article_bai_viet"][] | null,
): LinkRow["article_bai_viet"] {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function mapLinkRow(row: LinkRow): TruongNganhMonItem | null {
  const art = pickArticle(row.article_bai_viet);
  if (!art?.id || String(art.loai_bai_viet) !== "mon_hoc") return null;
  const label =
    art.tieu_de_viet?.trim() || art.tieu_de?.trim() || art.slug.trim();
  if (!label) return null;
  return {
    id: row.id,
    monHocId: art.id,
    label,
    slug: art.slug,
    thuTu: row.thu_tu ?? 0,
    ngungDay: Boolean(row.ngung_day),
    thumbnail: art.thumbnail?.trim() || null,
    coverId: art.cover_id?.trim() || null,
  };
}

export async function listMonForTruongNganh(
  admin: SupabaseClient,
  truongNganhId: string,
): Promise<TruongNganhMonItem[]> {
  const { data, error } = await admin
    .from("org_truong_nganh_mon")
    .select(
      "id, id_mon_hoc, thu_tu, ngung_day, article_bai_viet:article_bai_viet(id, slug, tieu_de, tieu_de_viet, loai_bai_viet, thumbnail, cover_id)",
    )
    .eq("id_truong_nganh", truongNganhId)
    .order("thu_tu", { ascending: true })
    .returns<LinkRow[]>();

  if (error) {
    console.error("[nganh-mon] list", error.message);
    return [];
  }

  return (data ?? [])
    .map(mapLinkRow)
    .filter((x): x is TruongNganhMonItem => x !== null);
}

export async function listMonByTruongNganhIds(
  admin: SupabaseClient,
  truongNganhIds: string[],
): Promise<Map<string, TruongNganhMonItem[]>> {
  const map = new Map<string, TruongNganhMonItem[]>();
  if (truongNganhIds.length === 0) return map;

  const { data, error } = await admin
    .from("org_truong_nganh_mon")
    .select(
      "id, id_truong_nganh, id_mon_hoc, thu_tu, ngung_day, article_bai_viet:article_bai_viet(id, slug, tieu_de, tieu_de_viet, loai_bai_viet, thumbnail, cover_id)",
    )
    .in("id_truong_nganh", truongNganhIds)
    .order("thu_tu", { ascending: true })
    .returns<
      Array<
        LinkRow & {
          id_truong_nganh: string;
        }
      >
    >();

  if (error) {
    console.error("[nganh-mon] listByIds", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const item = mapLinkRow(row);
    if (!item) continue;
    const list = map.get(row.id_truong_nganh) ?? [];
    list.push(item);
    map.set(row.id_truong_nganh, list);
  }
  return map;
}

async function assertProgramBelongsToOrg(
  admin: SupabaseClient,
  orgId: string,
  programId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("org_truong_nganh")
    .select("id")
    .eq("id", programId)
    .eq("id_to_chuc", orgId)
    .maybeSingle<{ id: string }>();
  return Boolean(data?.id);
}

/** Catalog `mon_hoc` published để picker thêm vào chương trình. */
export async function listMonHocCatalog(
  admin: SupabaseClient,
  params: { excludeIds?: string[]; query?: string | null } = {},
): Promise<TruongMonHocCatalogItem[]> {
  const exclude = new Set((params.excludeIds ?? []).filter(Boolean));
  const q = params.query?.trim() ?? "";

  let req = admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de_viet, tieu_de, thumbnail, cover_id")
    .eq("loai_bai_viet", "mon_hoc")
    .eq("trang_thai_noi_dung", "published")
    .order("tieu_de_viet", { ascending: true })
    .limit(MON_HOC_CATALOG_LIMIT);

  if (q.length > 0) {
    const safe = q.replace(/[%_,"()]/g, "").trim();
    if (safe) {
      const pattern = `%${safe}%`;
      req = req.or(
        `slug.ilike.${pattern},tieu_de_viet.ilike.${pattern},tieu_de.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await req;
  if (error) {
    console.error("[nganh-mon] catalog", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => !exclude.has(String(row.id)))
    .map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.tieu_de_viet ?? row.tieu_de ?? row.slug).trim(),
      thumbnail:
        row.thumbnail == null ? null : String(row.thumbnail).trim() || null,
      coverId:
        row.cover_id == null ? null : String(row.cover_id).trim() || null,
    }));
}

export async function addMonsToTruongNganh(
  admin: SupabaseClient,
  params: {
    orgId: string;
    programId: string;
    monHocIds: string[];
  },
): Promise<
  | { ok: true; items: TruongNganhMonItem[] }
  | { ok: false; error: string }
> {
  if (!(await assertProgramBelongsToOrg(admin, params.orgId, params.programId))) {
    return { ok: false, error: "Ngành không thuộc trường này." };
  }

  const ids = [
    ...new Set(params.monHocIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (ids.length === 0) {
    return { ok: false, error: "Chọn ít nhất một môn học." };
  }

  const { data: arts, error: artErr } = await admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, tieu_de_viet, loai_bai_viet, thumbnail, cover_id")
    .in("id", ids)
    .eq("loai_bai_viet", "mon_hoc");

  if (artErr) {
    return { ok: false, error: artErr.message };
  }

  const artById = new Map(
    (arts ?? []).map((a) => [
      String(a.id),
      a as {
        id: string;
        slug: string;
        tieu_de: string | null;
        tieu_de_viet: string | null;
        loai_bai_viet: string;
        thumbnail: string | null;
        cover_id: string | null;
      },
    ]),
  );

  for (const id of ids) {
    if (!artById.has(id)) {
      return { ok: false, error: "Có môn không hợp lệ trong danh sách chọn." };
    }
  }

  const existing = await listMonForTruongNganh(admin, params.programId);
  const existingIds = new Set(existing.map((m) => m.monHocId));
  const toAdd = ids.filter((id) => !existingIds.has(id));
  if (toAdd.length === 0) {
    return { ok: false, error: "Các môn đã chọn đã có trong chương trình." };
  }

  let nextThuTu =
    existing.reduce((max, m) => Math.max(max, m.thuTu), -1) + 1;

  const rows = toAdd.map((monHocId) => {
    const thuTu = nextThuTu;
    nextThuTu += 1;
    return {
      id_truong_nganh: params.programId,
      id_mon_hoc: monHocId,
      thu_tu: thuTu,
      ngung_day: false,
    };
  });

  const { data: inserted, error } = await admin
    .from("org_truong_nganh_mon")
    .insert(rows)
    .select("id, id_mon_hoc, thu_tu")
    .returns<Array<{ id: string; id_mon_hoc: string; thu_tu: number }>>();

  if (error || !inserted?.length) {
    return { ok: false, error: error?.message ?? "Không thêm được môn." };
  }

  const items: TruongNganhMonItem[] = [];
  for (const row of inserted) {
    const art = artById.get(row.id_mon_hoc);
    if (!art) continue;
    items.push({
      id: row.id,
      monHocId: art.id,
      label:
        art.tieu_de_viet?.trim() || art.tieu_de?.trim() || art.slug.trim(),
      slug: art.slug,
      thuTu: row.thu_tu,
      ngungDay: false,
      thumbnail: art.thumbnail?.trim() || null,
      coverId: art.cover_id?.trim() || null,
    });
  }

  items.sort((a, b) => a.thuTu - b.thuTu);
  return { ok: true, items };
}

export async function addMonToTruongNganh(
  admin: SupabaseClient,
  params: {
    orgId: string;
    programId: string;
    monHocId?: string | null;
    tenMonMoi?: string | null;
  },
): Promise<
  | { ok: true; item: TruongNganhMonItem }
  | { ok: false; error: string }
> {
  if (!(await assertProgramBelongsToOrg(admin, params.orgId, params.programId))) {
    return { ok: false, error: "Ngành không thuộc trường này." };
  }

  let monHocId = params.monHocId?.trim() || null;
  if (!monHocId && params.tenMonMoi?.trim()) {
    const created = await createTag({
      ten: params.tenMonMoi.trim(),
      loai: "mon_hoc",
    });
    if ("error" in created) {
      return { ok: false, error: created.error };
    }
    monHocId = created.id;
  }
  if (!monHocId) {
    return { ok: false, error: "Chọn hoặc tạo môn học." };
  }

  const { data: art } = await admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, tieu_de_viet, loai_bai_viet, thumbnail, cover_id")
    .eq("id", monHocId)
    .maybeSingle<{
      id: string;
      slug: string;
      tieu_de: string | null;
      tieu_de_viet: string | null;
      loai_bai_viet: string;
      thumbnail: string | null;
      cover_id: string | null;
    }>();

  if (!art?.id || art.loai_bai_viet !== "mon_hoc") {
    return { ok: false, error: "Bài viết không phải môn học." };
  }

  const existing = await listMonForTruongNganh(admin, params.programId);
  if (existing.some((m) => m.monHocId === monHocId)) {
    return { ok: false, error: "Môn học đã có trong chương trình." };
  }

  const nextThuTu =
    existing.reduce((max, m) => Math.max(max, m.thuTu), -1) + 1;

  const { data: inserted, error } = await admin
    .from("org_truong_nganh_mon")
    .insert({
      id_truong_nganh: params.programId,
      id_mon_hoc: monHocId,
      thu_tu: nextThuTu,
      ngung_day: false,
    })
    .select("id, id_mon_hoc, thu_tu, ngung_day")
    .maybeSingle<{
      id: string;
      id_mon_hoc: string;
      thu_tu: number;
      ngung_day: boolean | null;
    }>();

  if (error || !inserted?.id) {
    return { ok: false, error: error?.message ?? "Không thêm được môn." };
  }

  return {
    ok: true,
    item: {
      id: inserted.id,
      monHocId: art.id,
      label:
        art.tieu_de_viet?.trim() || art.tieu_de?.trim() || art.slug.trim(),
      slug: art.slug,
      thuTu: inserted.thu_tu,
      ngungDay: Boolean(inserted.ngung_day),
      thumbnail: art.thumbnail?.trim() || null,
      coverId: art.cover_id?.trim() || null,
    },
  };
}

export async function setNgungDayMonOnTruongNganh(
  admin: SupabaseClient,
  params: {
    orgId: string;
    programId: string;
    monHocId: string;
    ngungDay: boolean;
  },
): Promise<
  | { ok: true; item: TruongNganhMonItem }
  | { ok: false; error: string }
> {
  if (!(await assertProgramBelongsToOrg(admin, params.orgId, params.programId))) {
    return { ok: false, error: "Ngành không thuộc trường này." };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("org_truong_nganh_mon")
    .update({
      ngung_day: params.ngungDay,
      ngung_day_luc: params.ngungDay ? now : null,
    })
    .eq("id_truong_nganh", params.programId)
    .eq("id_mon_hoc", params.monHocId)
    .select(
      "id, id_mon_hoc, thu_tu, ngung_day, article_bai_viet:article_bai_viet(id, slug, tieu_de, tieu_de_viet, loai_bai_viet, thumbnail, cover_id)",
    )
    .maybeSingle<LinkRow>();

  if (error) return { ok: false, error: error.message };
  const item = updated ? mapLinkRow(updated) : null;
  if (!item) {
    return { ok: false, error: "Không tìm thấy môn trong chương trình." };
  }
  return { ok: true, item };
}

export async function removeMonFromTruongNganh(
  admin: SupabaseClient,
  params: { orgId: string; programId: string; monHocId: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await assertProgramBelongsToOrg(admin, params.orgId, params.programId))) {
    return { ok: false, error: "Ngành không thuộc trường này." };
  }

  const { error } = await admin
    .from("org_truong_nganh_mon")
    .delete()
    .eq("id_truong_nganh", params.programId)
    .eq("id_mon_hoc", params.monHocId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Đặt lại `thu_tu` theo thứ tự `monHocIds` (0..n-1) — dùng cho filter / picker. */
export async function reorderMonsOnTruongNganh(
  admin: SupabaseClient,
  params: {
    orgId: string;
    programId: string;
    monHocIds: string[];
  },
): Promise<
  | { ok: true; items: TruongNganhMonItem[] }
  | { ok: false; error: string }
> {
  if (!(await assertProgramBelongsToOrg(admin, params.orgId, params.programId))) {
    return { ok: false, error: "Ngành không thuộc trường này." };
  }

  const ordered = [
    ...new Set(params.monHocIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (ordered.length === 0) {
    return { ok: false, error: "Danh sách môn trống." };
  }

  const existing = await listMonForTruongNganh(admin, params.programId);
  if (existing.length === 0) {
    return { ok: false, error: "Chương trình chưa có môn." };
  }
  if (ordered.length !== existing.length) {
    return { ok: false, error: "Danh sách môn không khớp chương trình." };
  }

  const existingIds = new Set(existing.map((m) => m.monHocId));
  for (const id of ordered) {
    if (!existingIds.has(id)) {
      return { ok: false, error: "Có môn không thuộc chương trình." };
    }
  }

  const results = await Promise.all(
    ordered.map((monHocId, thuTu) =>
      admin
        .from("org_truong_nganh_mon")
        .update({ thu_tu: thuTu })
        .eq("id_truong_nganh", params.programId)
        .eq("id_mon_hoc", monHocId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { ok: false, error: failed.error.message };
  }

  const items = await listMonForTruongNganh(admin, params.programId);
  return { ok: true, items };
}

/** Gắn đồ án mới: chỉ môn đang dạy (`ngung_day = false`). */
export async function validateMonBelongsToNganh(
  admin: SupabaseClient,
  nganhId: string,
  monHocId: string,
): Promise<{ ok: true; label: string } | { ok: false; error: string }> {
  const mons = await listMonForTruongNganh(admin, nganhId);
  const match = mons.find((m) => m.monHocId === monHocId);
  if (!match) {
    return { ok: false, error: "Môn học không thuộc ngành đã chọn." };
  }
  if (match.ngungDay) {
    return {
      ok: false,
      error: "Môn này đã ngưng dạy — chọn môn đang mở trong chương trình.",
    };
  }
  return { ok: true, label: match.label };
}
