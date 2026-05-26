import {
  normalizeArticleThumbnailValue,
  resolveAdminArticleThumbSrc,
} from "@/lib/admin/article-display";
import { buildContentPreview, buildMetaPreview } from "@/lib/admin/article-preview";
import { slugifyNganhTitle, uniqueNganhArticleSlug } from "@/lib/nganh/hub-slug";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";
import type { ArticleMeta } from "@/lib/articles/types";

export const ADMIN_ARTICLE_LOAI_OPTIONS = [
  "nghe",
  "keyword",
  "phan_mem",
  "mon_hoc",
  "nganh_dao_tao",
  "blog",
  "event",
] as const;

export type AdminArticleLoai = (typeof ADMIN_ARTICLE_LOAI_OPTIONS)[number];

const ADMIN_ARTICLE_STATUS = new Set([
  "cho_review",
  "dang_viet",
  "published",
  "archived",
  "merged",
]);

export type AdminArticleNhomBrief = {
  id: string;
  ten: string;
  loai_nhom: string;
};

export type AdminLinhVucOption = {
  id: string;
  ten: string;
};

export type AdminArticleFilterOptions = {
  linhVuc: AdminLinhVucOption[];
  nhom: AdminArticleNhomBrief[];
};

/** Số bài tải tối đa cho admin list (lọc phía client trên tập này). */
export const ADMIN_ARTICLE_LIST_LIMIT = 2000;

export type AdminArticleListRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  loai_bai_viet: string;
  tom_tat: string | null;
  trang_thai_noi_dung: string;
  luot_xem: number;
  tao_luc: string | null;
  cap_nhat_luc: string;
  cover_id: string | null;
  thumbnail: string | null;
  /** URL ảnh đã resolve trên server (ưu tiên khi render admin). */
  thumbnail_src: string | null;
  thumbnail_from_cover: boolean;
  id_linh_vuc: string | null;
  linh_vuc_ten: string | null;
  nhom: AdminArticleNhomBrief[];
  has_noi_dung: boolean;
  noi_dung_preview: string | null;
  noi_dung_chars: number;
  has_meta: boolean;
  meta_preview: string | null;
};

/** Khớp schema thực tế + `docs/cursor_map_admin.md` — không có `noi_dung_markdown`. */
const LIST_SELECT_PLAIN =
  "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, loai_bai_viet, tom_tat, noi_dung, meta, meta_title, meta_description, main_video, trang_thai_noi_dung, luot_xem, tao_luc, cap_nhat_luc, cover_id, thumbnail, id_linh_vuc";

const LIST_SELECT_EMBED = `${LIST_SELECT_PLAIN}, linh_vuc:id_linh_vuc(id, slug, ten), article_gan_nhom(id_nhom, article_nhom(id, ten, loai_nhom))`;

function parseNhomEmbed(raw: unknown): AdminArticleNhomBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    ten: String(o.ten ?? "").trim() || id,
    loai_nhom: String(o.loai_nhom ?? "").trim(),
  };
}

function parseListRow(raw: Record<string, unknown>): AdminArticleListRow {
  const gan = raw.article_gan_nhom;
  const nhomMap = new Map<string, AdminArticleNhomBrief>();
  if (Array.isArray(gan)) {
    for (const link of gan) {
      if (!link || typeof link !== "object") continue;
      const l = link as Record<string, unknown>;
      const embed = parseNhomEmbed(l.article_nhom);
      const nhomId = embed?.id ?? String(l.id_nhom ?? "").trim();
      if (embed && nhomId) nhomMap.set(nhomId, embed);
    }
  }

  const lv = raw.linh_vuc;
  let linh_vuc_ten: string | null = null;
  const idLv =
    raw.id_linh_vuc != null && String(raw.id_linh_vuc).trim() !== ""
      ? String(raw.id_linh_vuc).trim()
      : null;
  if (lv && typeof lv === "object") {
    const e = lv as Record<string, unknown>;
    linh_vuc_ten = String(e.ten ?? "").trim() || null;
  }

  return {
    id: String(raw.id),
    slug: String(raw.slug ?? ""),
    tieu_de: String(raw.tieu_de ?? ""),
    tieu_de_viet: (raw.tieu_de_viet as string | null) ?? null,
    tieu_de_eng: (raw.tieu_de_eng as string | null) ?? null,
    loai_bai_viet: String(raw.loai_bai_viet ?? ""),
    tom_tat: (raw.tom_tat as string | null) ?? null,
    trang_thai_noi_dung: String(raw.trang_thai_noi_dung ?? ""),
    luot_xem: Number(raw.luot_xem ?? 0),
    tao_luc: (raw.tao_luc as string | null) ?? null,
    cap_nhat_luc: String(raw.cap_nhat_luc ?? ""),
    cover_id:
      raw.cover_id == null ? null : String(raw.cover_id).trim() || null,
    thumbnail: normalizeArticleThumbnailValue(raw.thumbnail),
    thumbnail_src: null,
    thumbnail_from_cover: false,
    id_linh_vuc: idLv,
    linh_vuc_ten,
    nhom: [...nhomMap.values()].sort((a, b) =>
      a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" }),
    ),
    ...(() => {
      const content = buildContentPreview({
        noi_dung: raw.noi_dung as string | null,
      });
      const metaP = buildMetaPreview(raw.meta);
      return {
        has_noi_dung: content.hasData,
        noi_dung_preview: content.preview,
        noi_dung_chars: content.charCount,
        has_meta: metaP.hasData,
        meta_preview: metaP.preview,
      };
    })(),
  };
}

async function attachNhomToRows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  rows: AdminArticleListRow[],
): Promise<AdminArticleListRow[]> {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const { data: ganRows } = await supabase
    .from("article_gan_nhom")
    .select("id_bai_viet, id_nhom")
    .in("id_bai_viet", ids);

  const linksByBai = new Map<string, string[]>();
  for (const row of ganRows ?? []) {
    const baiId = String((row as { id_bai_viet?: string }).id_bai_viet ?? "").trim();
    const nhomId = String((row as { id_nhom?: string }).id_nhom ?? "").trim();
    if (!baiId || !nhomId) continue;
    const arr = linksByBai.get(baiId) ?? [];
    if (!arr.includes(nhomId)) arr.push(nhomId);
    linksByBai.set(baiId, arr);
  }

  const nhomIds = [...new Set([...linksByBai.values()].flat())];
  const nhomById = new Map<string, AdminArticleNhomBrief>();
  if (nhomIds.length) {
    const { data: nhomRows } = await supabase
      .from("article_nhom")
      .select("id, ten, loai_nhom")
      .in("id", nhomIds);
    for (const r of nhomRows ?? []) {
      const p = parseNhomEmbed(r);
      if (p) nhomById.set(p.id, p);
    }
  }

  return rows.map((row) => {
    const nhom = (linksByBai.get(row.id) ?? [])
      .map((nid) => nhomById.get(nid))
      .filter((x): x is AdminArticleNhomBrief => x != null)
      .sort((a, b) => a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" }));
    return { ...row, nhom };
  });
}

async function attachLinhVucNames(
  supabase: ReturnType<typeof createServiceRoleClient>,
  rows: AdminArticleListRow[],
): Promise<AdminArticleListRow[]> {
  const needIds = [
    ...new Set(
      rows
        .filter((r) => r.id_linh_vuc && !r.linh_vuc_ten)
        .map((r) => r.id_linh_vuc as string),
    ),
  ];
  if (!needIds.length) return rows;
  const { data } = await supabase
    .from("linh_vuc")
    .select("id, ten")
    .in("id", needIds);
  const byId = new Map(
    (data ?? []).map((r) => [
      String((r as { id: string }).id),
      String((r as { ten: string }).ten ?? ""),
    ]),
  );
  return rows.map((r) =>
    r.id_linh_vuc && !r.linh_vuc_ten
      ? { ...r, linh_vuc_ten: byId.get(r.id_linh_vuc) ?? null }
      : r,
  );
}

export async function listAdminArticleFilterOptions(): Promise<
  AdminArticleFilterOptions
> {
  if (!hasServiceRoleEnv()) return { linhVuc: [], nhom: [] };
  const supabase = createServiceRoleClient();
  const [lvRes, nhomRes] = await Promise.all([
    supabase.from("linh_vuc").select("id, ten").order("ten"),
    supabase
      .from("article_nhom")
      .select("id, ten, loai_nhom, thu_tu")
      .order("thu_tu"),
  ]);
  const linhVuc = (lvRes.data ?? [])
    .map((r) => ({
      id: String((r as { id: string }).id),
      ten: String((r as { ten: string }).ten ?? "").trim() || "Lĩnh vực",
    }))
    .filter((x) => x.id);
  const nhom = (nhomRes.data ?? [])
    .map((r) => parseNhomEmbed(r))
    .filter((x): x is AdminArticleNhomBrief => x != null);
  return { linhVuc, nhom };
}

async function attachThumbnailSrcToRows(
  rows: AdminArticleListRow[],
): Promise<AdminArticleListRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      const { src, fromCover } = await resolveAdminArticleThumbSrc(row);
      return {
        ...row,
        thumbnail_src: src,
        thumbnail_from_cover: fromCover,
      };
    }),
  );
}

export type AdminArticleDetailRow = AdminArticleListRow & {
  noi_dung: string | null;
  meta: ArticleMeta;
  meta_title: string | null;
  meta_description: string | null;
  main_video: string | null;
};

export async function listArticlesForAdmin(): Promise<
  | {
      ok: true;
      rows: AdminArticleListRow[];
      filterOptions: AdminArticleFilterOptions;
      /** Tổng bài trong DB (count). */
      totalCount: number;
      /** Số bài thực tế tải về (≤ ADMIN_ARTICLE_LIST_LIMIT, mới nhất trước). */
      loadedCount: number;
    }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    let data: Record<string, unknown>[] | null = null;

    const { count: totalCountRaw } = await supabase
      .from("article_bai_viet")
      .select("id", { count: "exact", head: true });
    const totalCount = totalCountRaw ?? 0;

    const withEmbed = await supabase
      .from("article_bai_viet")
      .select(LIST_SELECT_EMBED)
      .order("cap_nhat_luc", { ascending: false })
      .limit(ADMIN_ARTICLE_LIST_LIMIT);

    if (!withEmbed.error && withEmbed.data) {
      data = withEmbed.data as Record<string, unknown>[];
    } else {
      const plain = await supabase
        .from("article_bai_viet")
        .select(LIST_SELECT_PLAIN)
        .order("cap_nhat_luc", { ascending: false })
        .limit(ADMIN_ARTICLE_LIST_LIMIT);
      if (plain.error) return { ok: false, message: plain.error.message };
      data = (plain.data ?? []) as Record<string, unknown>[];
    }

    let rows = (data ?? []).map((r) => parseListRow(r));
    rows = await attachNhomToRows(supabase, rows);
    rows = await attachLinhVucNames(supabase, rows);
    rows = await attachThumbnailSrcToRows(rows);

    const filterOptions = await listAdminArticleFilterOptions();
    return {
      ok: true,
      rows,
      filterOptions,
      totalCount,
      loadedCount: rows.length,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

/** Một cạnh `article_lien_quan` + bài đích (đã resolve). */
export type AdminArticleLienQuanRow = {
  loai_quan_he: string;
  cap_do: string | null;
  id: string;
  slug: string;
  tieu_de: string;
  loai_bai_viet: string;
  trang_thai_noi_dung: string;
  cover_id: string | null;
  thumbnail: string | null;
  thumbnail_src: string | null;
};

export type AdminArticleLienQuanPickerItem = {
  id: string;
  slug: string;
  tieu_de: string;
  loai_bai_viet: string;
  trang_thai_noi_dung: string;
  cover_id: string | null;
  thumbnail: string | null;
  thumbnail_src: string | null;
};

const ARTICLE_LIEN_QUAN_PICKER_LIMIT = 120;

async function attachThumbToLienQuanRows(
  rows: AdminArticleLienQuanRow[],
): Promise<AdminArticleLienQuanRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      const { src } = await resolveAdminArticleThumbSrc({
        thumbnail: row.thumbnail,
        cover_id: row.cover_id,
      });
      return { ...row, thumbnail_src: src };
    }),
  );
}

async function attachThumbToPickerItems(
  items: Omit<AdminArticleLienQuanPickerItem, "thumbnail_src">[],
): Promise<AdminArticleLienQuanPickerItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const { src } = await resolveAdminArticleThumbSrc({
        thumbnail: item.thumbnail,
        cover_id: item.cover_id,
      });
      return { ...item, thumbnail_src: src };
    }),
  );
}

export type AdminLienQuanManageMode = "outgoing" | "nganh_mon_hoc";

export type AdminArticleLienQuanBundle = {
  /** Bài này là A → các B (cạnh đi ra thô). */
  outgoing: AdminArticleLienQuanRow[];
  /** Bài khác là A → trỏ tới bài này (B). */
  incoming: AdminArticleLienQuanRow[];
  /** Tập chỉnh trong popup «Đã gán». */
  managed: AdminArticleLienQuanRow[];
  manageMode: AdminLienQuanManageMode;
};

const MON_CAP_ORDER: Record<string, number> = {
  dai_cuong: 0,
  co_so: 1,
  chuyen_nganh: 2,
};

function resolveManagedLienQuan(
  outgoing: AdminArticleLienQuanRow[],
  incoming: AdminArticleLienQuanRow[],
  loaiBaiViet?: string,
): { managed: AdminArticleLienQuanRow[]; manageMode: AdminLienQuanManageMode } {
  if (loaiBaiViet === "nganh_dao_tao") {
    const managed = incoming
      .filter(
        (r) =>
          r.loai_quan_he.toUpperCase() === "DUNG_TRONG_NGANH" &&
          r.loai_bai_viet === "mon_hoc",
      )
      .sort((a, b) => {
        const ca = a.cap_do ? (MON_CAP_ORDER[a.cap_do] ?? 1) : 1;
        const cb = b.cap_do ? (MON_CAP_ORDER[b.cap_do] ?? 1) : 1;
        if (ca !== cb) return ca - cb;
        return a.tieu_de.localeCompare(b.tieu_de, "vi");
      });
    return { managed, manageMode: "nganh_mon_hoc" };
  }
  return { managed: outgoing, manageMode: "outgoing" };
}

export async function listArticleLienQuanForAdmin(
  articleId: string,
  loaiBaiViet?: string,
): Promise<
  | { ok: true; bundle: AdminArticleLienQuanBundle }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const [outRes, inRes] = await Promise.all([
      supabase
        .from("article_lien_quan")
        .select("id_bai_viet_b, loai_quan_he, cap_do")
        .eq("id_bai_viet_a", articleId),
      supabase
        .from("article_lien_quan")
        .select("id_bai_viet_a, loai_quan_he, cap_do")
        .eq("id_bai_viet_b", articleId),
    ]);

    if (outRes.error) return { ok: false, message: outRes.error.message };
    if (inRes.error) return { ok: false, message: inRes.error.message };

    type EdgeOut = {
      id_bai_viet_b?: string;
      loai_quan_he?: string;
      cap_do?: string | null;
    };
    type EdgeIn = {
      id_bai_viet_a?: string;
      loai_quan_he?: string;
      cap_do?: string | null;
    };

    const outEdges = (outRes.data ?? []) as EdgeOut[];
    const inEdges = (inRes.data ?? []) as EdgeIn[];

    const idSet = new Set<string>();
    for (const e of outEdges) {
      const id = String(e.id_bai_viet_b ?? "").trim();
      if (id) idSet.add(id);
    }
    for (const e of inEdges) {
      const id = String(e.id_bai_viet_a ?? "").trim();
      if (id) idSet.add(id);
    }

    if (!idSet.size) {
      const resolved = resolveManagedLienQuan([], [], loaiBaiViet);
      return {
        ok: true,
        bundle: {
          outgoing: [],
          incoming: [],
          managed: resolved.managed,
          manageMode: resolved.manageMode,
        },
      };
    }

    const { data: articles, error: artErr } = await supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, loai_bai_viet, trang_thai_noi_dung, cover_id, thumbnail",
      )
      .in("id", [...idSet]);
    if (artErr) return { ok: false, message: artErr.message };

    const byId = new Map(
      (articles ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return [
          String(row.id),
          {
            id: String(row.id),
            slug: String(row.slug ?? ""),
            tieu_de: String(row.tieu_de ?? "").trim() || "Không tiêu đề",
            loai_bai_viet: String(row.loai_bai_viet ?? ""),
            trang_thai_noi_dung: String(row.trang_thai_noi_dung ?? ""),
            cover_id:
              row.cover_id == null
                ? null
                : String(row.cover_id).trim() || null,
            thumbnail: normalizeArticleThumbnailValue(row.thumbnail),
            thumbnail_src: null,
          },
        ];
      }),
    );

    const outgoing: AdminArticleLienQuanRow[] = [];
    for (const e of outEdges) {
      const id = String(e.id_bai_viet_b ?? "").trim();
      const art = byId.get(id);
      if (!art) continue;
      outgoing.push({
        ...art,
        loai_quan_he: String(e.loai_quan_he ?? "").trim() || "LIEN_QUAN",
        cap_do: e.cap_do?.trim() || null,
      });
    }

    const incoming: AdminArticleLienQuanRow[] = [];
    for (const e of inEdges) {
      const id = String(e.id_bai_viet_a ?? "").trim();
      const art = byId.get(id);
      if (!art) continue;
      incoming.push({
        ...art,
        loai_quan_he: String(e.loai_quan_he ?? "").trim() || "LIEN_QUAN",
        cap_do: e.cap_do?.trim() || null,
      });
    }

    const sortFn = (a: AdminArticleLienQuanRow, b: AdminArticleLienQuanRow) =>
      a.loai_quan_he.localeCompare(b.loai_quan_he) ||
      a.tieu_de.localeCompare(b.tieu_de, "vi");
    outgoing.sort(sortFn);
    incoming.sort(sortFn);

    const [outWithThumb, inWithThumb] = await Promise.all([
      attachThumbToLienQuanRows(outgoing),
      attachThumbToLienQuanRows(incoming),
    ]);

    const { managed, manageMode } = resolveManagedLienQuan(
      outWithThumb,
      inWithThumb,
      loaiBaiViet,
    );
    const managedWithThumb = await attachThumbToLienQuanRows(managed);

    return {
      ok: true,
      bundle: {
        outgoing: outWithThumb,
        incoming: inWithThumb,
        managed: managedWithThumb,
        manageMode,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

/** Tìm bài để gán liên quan (dropdown multiselect). */
export async function searchArticlesForLienQuanPicker(
  articleId: string,
  query: string,
  loaiBaiViet?: string,
): Promise<
  | { ok: true; items: AdminArticleLienQuanPickerItem[] }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const self = articleId.trim();
    const q = query.trim();

    let req = supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, tieu_de_viet, loai_bai_viet, trang_thai_noi_dung, cover_id, thumbnail",
      )
      .neq("id", self)
      .order("cap_nhat_luc", { ascending: false })
      .limit(ARTICLE_LIEN_QUAN_PICKER_LIMIT);

    if (loaiBaiViet === "nganh_dao_tao") {
      req = req.eq("loai_bai_viet", "mon_hoc");
    }

    if (q.length > 0) {
      const safe = q.replace(/[%_,"()]/g, "").trim();
      if (safe) {
        const pattern = `%${safe}%`;
        req = req.or(
          `slug.ilike.${pattern},tieu_de.ilike.${pattern},tieu_de_viet.ilike.${pattern}`,
        );
      }
    }

    const { data, error } = await req;
    if (error) return { ok: false, message: error.message };

    const rawItems = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        slug: String(r.slug ?? ""),
        tieu_de:
          String(r.tieu_de_viet ?? r.tieu_de ?? r.slug ?? "").trim() ||
          "Không tiêu đề",
        loai_bai_viet: String(r.loai_bai_viet ?? ""),
        trang_thai_noi_dung: String(r.trang_thai_noi_dung ?? ""),
        cover_id:
          r.cover_id == null ? null : String(r.cover_id).trim() || null,
        thumbnail: normalizeArticleThumbnailValue(r.thumbnail),
        thumbnail_src: null as string | null,
      };
    });

    const items = await attachThumbToPickerItems(rawItems);
    return { ok: true, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

/**
 * Đồng bộ cạnh đi ra A→B theo tập id đích (multiselect).
 * Bài bỏ chọn: xóa mọi `loai_quan_he` tới B đó. Bài mới: thêm `LIEN_QUAN`.
 */
export async function syncArticleOutgoingLienQuan(
  articleId: string,
  targetArticleIds: string[],
): Promise<
  | { ok: true; bundle: AdminArticleLienQuanBundle }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const self = articleId.trim();
  if (!self) return { ok: false, message: "Thiếu id bài viết." };

  const newIds = [
    ...new Set(
      targetArticleIds.map((id) => id.trim()).filter((id) => id && id !== self),
    ),
  ];
  const newSet = new Set(newIds);

  try {
    const supabase = createServiceRoleClient();
    const { data: edges, error: e0 } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_b")
      .eq("id_bai_viet_a", self);
    if (e0) return { ok: false, message: e0.message };

    const currentB = new Set(
      (edges ?? []).map((e) =>
        String((e as { id_bai_viet_b?: string }).id_bai_viet_b ?? "").trim(),
      ).filter(Boolean),
    );

    for (const b of currentB) {
      if (newSet.has(b)) continue;
      const { error } = await supabase
        .from("article_lien_quan")
        .delete()
        .eq("id_bai_viet_a", self)
        .eq("id_bai_viet_b", b);
      if (error) return { ok: false, message: error.message };
    }

    const toAdd = newIds.filter((b) => !currentB.has(b));
    if (toAdd.length) {
      const { error } = await supabase.from("article_lien_quan").upsert(
        toAdd.map((b) => ({
          id_bai_viet_a: self,
          id_bai_viet_b: b,
          loai_quan_he: "LIEN_QUAN",
        })),
        { onConflict: "id_bai_viet_a,id_bai_viet_b,loai_quan_he" },
      );
      if (error) return { ok: false, message: error.message };
    }

    return listArticleLienQuanForAdmin(self);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

/** Môn → ngành (`DUNG_TRONG_NGANH`): môn = A, ngành = B. */
export async function syncNganhMonHocLienQuan(
  nganhArticleId: string,
  monArticleIds: string[],
): Promise<
  | { ok: true; bundle: AdminArticleLienQuanBundle }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const nganhId = nganhArticleId.trim();
  if (!nganhId) return { ok: false, message: "Thiếu id bài ngành." };

  const newMonIds = [
    ...new Set(
      monArticleIds.map((id) => id.trim()).filter((id) => id && id !== nganhId),
    ),
  ];
  const newSet = new Set(newMonIds);

  try {
    const supabase = createServiceRoleClient();
    const { data: edges, error: e0 } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_a, cap_do")
      .eq("id_bai_viet_b", nganhId)
      .eq("loai_quan_he", "DUNG_TRONG_NGANH");
    if (e0) return { ok: false, message: e0.message };

    const currentMon = new Set(
      (edges ?? []).map((e) =>
        String((e as { id_bai_viet_a?: string }).id_bai_viet_a ?? "").trim(),
      ).filter(Boolean),
    );

    for (const monId of currentMon) {
      if (newSet.has(monId)) continue;
      const { error } = await supabase
        .from("article_lien_quan")
        .delete()
        .eq("id_bai_viet_a", monId)
        .eq("id_bai_viet_b", nganhId)
        .eq("loai_quan_he", "DUNG_TRONG_NGANH");
      if (error) return { ok: false, message: error.message };
    }

    const toAdd = newMonIds.filter((id) => !currentMon.has(id));
    if (toAdd.length) {
      const { error } = await supabase.from("article_lien_quan").upsert(
        toAdd.map((monId) => ({
          id_bai_viet_a: monId,
          id_bai_viet_b: nganhId,
          loai_quan_he: "DUNG_TRONG_NGANH",
          cap_do: null,
        })),
        { onConflict: "id_bai_viet_a,id_bai_viet_b,loai_quan_he" },
      );
      if (error) return { ok: false, message: error.message };
    }

    return listArticleLienQuanForAdmin(nganhId, "nganh_dao_tao");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function syncArticleManagedLienQuan(
  articleId: string,
  loaiBaiViet: string,
  targetArticleIds: string[],
): Promise<
  | { ok: true; bundle: AdminArticleLienQuanBundle }
  | { ok: false; message: string }
> {
  if (loaiBaiViet === "nganh_dao_tao") {
    return syncNganhMonHocLienQuan(articleId, targetArticleIds);
  }
  return syncArticleOutgoingLienQuan(articleId, targetArticleIds);
}

export async function getArticleBodyForAdmin(
  id: string,
): Promise<
  | { ok: true; row: AdminArticleDetailRow }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, loai_bai_viet, tom_tat, noi_dung, meta, meta_title, meta_description, main_video, trang_thai_noi_dung, cover_id, thumbnail, luot_xem, tao_luc, cap_nhat_luc, id_linh_vuc",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Không tìm thấy bài viết." };

    const raw = data as Record<string, unknown>;
    const base = parseListRow(raw);
    const { src } = await resolveAdminArticleThumbSrc(base);
    const row: AdminArticleDetailRow = {
      ...base,
      thumbnail_src: src,
      thumbnail_from_cover: Boolean(src && !base.thumbnail?.trim()),
      noi_dung: (raw.noi_dung as string | null) ?? null,
      meta: (raw.meta as ArticleMeta) ?? null,
      meta_title: (raw.meta_title as string | null) ?? null,
      meta_description: (raw.meta_description as string | null) ?? null,
      main_video: (raw.main_video as string | null) ?? null,
    };
    return { ok: true, row };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type AdminArticlePatch = {
  tieu_de?: string;
  tieu_de_viet?: string | null;
  tieu_de_eng?: string | null;
  tom_tat?: string | null;
  noi_dung?: string | null;
  cover_id?: string | null;
  thumbnail?: string | null;
  main_video?: string | null;
  meta?: ArticleMeta | null;
  trang_thai_noi_dung?: string;
};

export async function updateArticleForAdmin(
  id: string,
  patch: AdminArticlePatch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const cap_nhat_luc = new Date().toISOString();
    const payload = Object.fromEntries(
      [...Object.entries(patch), ["cap_nhat_luc", cap_nhat_luc]].filter(
        ([, v]) => v !== undefined,
      ),
    );
    const { error } = await supabase
      .from("article_bai_viet")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type AdminArticleCreateInput = {
  tieu_de: string;
  slug?: string | null;
  loai_bai_viet: string;
  trang_thai_noi_dung?: string;
  tieu_de_viet?: string | null;
  tieu_de_eng?: string | null;
  tom_tat?: string | null;
  id_linh_vuc?: string | null;
  meta?: ArticleMeta | null;
};

export async function createArticleForAdmin(
  input: AdminArticleCreateInput,
): Promise<
  { ok: true; id: string; slug: string } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }

  const tieu_de = input.tieu_de.trim();
  if (!tieu_de) return { ok: false, message: "Tiêu đề không được trống." };

  const loai = input.loai_bai_viet.trim();
  if (!ADMIN_ARTICLE_LOAI_OPTIONS.includes(loai as AdminArticleLoai)) {
    return { ok: false, message: "Loại bài viết không hợp lệ." };
  }

  const trang_thai = (input.trang_thai_noi_dung ?? "dang_viet").trim();
  if (!ADMIN_ARTICLE_STATUS.has(trang_thai)) {
    return { ok: false, message: "Trạng thái không hợp lệ." };
  }

  const id_linh_vuc = input.id_linh_vuc?.trim() || null;
  if (loai === "nghe" && !id_linh_vuc) {
    return {
      ok: false,
      message: "Bài loại nghe bắt buộc chọn lĩnh vực (id_linh_vuc).",
    };
  }

  try {
    const supabase = createServiceRoleClient();
    const slugRaw = input.slug?.trim() ?? "";
    const baseSlug =
      slugifyNganhTitle(slugRaw) || slugifyNganhTitle(tieu_de) || "bai-viet-moi";
    const slug = await uniqueNganhArticleSlug(async (candidate) => {
      const { data } = await supabase
        .from("article_bai_viet")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      return Boolean(data);
    }, baseSlug);

    const now = new Date().toISOString();
    const tieu_de_viet = input.tieu_de_viet?.trim() || null;
    const tieu_de_eng = input.tieu_de_eng?.trim() || null;

    const { data, error } = await supabase
      .from("article_bai_viet")
      .insert({
        slug,
        tieu_de,
        tieu_de_viet,
        tieu_de_eng,
        loai_bai_viet: loai,
        trang_thai_noi_dung: trang_thai,
        tom_tat: input.tom_tat?.trim() || null,
        noi_dung: "",
        meta: input.meta ?? {},
        id_linh_vuc,
        luot_xem: 0,
        tao_luc: now,
        cap_nhat_luc: now,
      })
      .select("id, slug")
      .single();

    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Không đọc được bản ghi vừa tạo." };

    return {
      ok: true,
      id: String(data.id),
      slug: String(data.slug ?? slug),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}
