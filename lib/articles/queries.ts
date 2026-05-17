import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { describeFetchFailure } from "@/lib/supabase/errors";
import type {
  ArticleBaiViet,
  ArticleCard,
  ArticleListItem,
  CotMocStub,
  LinhVucEmbed,
  NgheArticleHubRow,
  TacPhamGalleryItem,
  TacPhamStub,
  TruongNganhRow,
} from "@/lib/articles/types";
import type { RelatedJobLienQuanRow } from "@/lib/articles/related-jobs-dynamic";

function normalizeArticleRow(raw: Record<string, unknown>): ArticleBaiViet {
  const tieu_de = String(raw.tieu_de ?? raw.ten ?? "").trim() || "Không tiêu đề";
  const noi_dung =
    (raw.noi_dung as string | undefined) ??
    (raw.noi_dung_markdown as string | undefined) ??
    null;
  return {
    ...(raw as unknown as ArticleBaiViet),
    tieu_de,
    noi_dung,
    tieu_de_viet:
      raw.tieu_de_viet === undefined || raw.tieu_de_viet === null
        ? null
        : String(raw.tieu_de_viet).trim() || null,
  };
}

function parseLinhVucEmbed(raw: unknown): LinhVucEmbed | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    slug: String(o.slug ?? "").trim(),
    ten: String(o.ten ?? "").trim() || "Lĩnh vực",
  };
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleBaiViet | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    let data: Record<string, unknown> | null = null;

    const withLv = await supabase
      .from("article_bai_viet")
      .select("*, linh_vuc:id_linh_vuc(id, slug, ten)")
      .eq("slug", slug)
      .maybeSingle();
    if (!withLv.error && withLv.data) {
      data = withLv.data as Record<string, unknown>;
    } else {
      const plain = await supabase
        .from("article_bai_viet")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (plain.error || !plain.data) return null;
      data = plain.data as Record<string, unknown>;
    }

    const article = normalizeArticleRow(data);
    const idLv =
      data.id_linh_vuc != null && String(data.id_linh_vuc).trim() !== ""
        ? String(data.id_linh_vuc).trim()
        : null;
    const embed = parseLinhVucEmbed(data.linh_vuc);
    return {
      ...article,
      id_linh_vuc: idLv ?? embed?.id ?? null,
      linh_vuc: embed,
    };
  } catch {
    return null;
  }
}

/** Chi tiết nghề — `article_bai_viet` (hub + `/nghe-nghiep/[slug]`). */
export async function getNgheArticleBySlug(
  slug: string,
): Promise<ArticleBaiViet | null> {
  const article = await getArticleBySlug(slug);
  if (!article || article.loai_bai_viet !== "nghe") return null;
  if (article.trang_thai_noi_dung !== "published") return null;
  return article;
}

export async function getArticleById(
  id: string,
): Promise<ArticleBaiViet | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return normalizeArticleRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export type MonHocForNganhRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
};

export type NgheForNganhRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tom_tat: string | null;
  cover_id: string | null;
};

/**
 * Môn học trong chương trình ngành (`DUNG_TRONG_NGANH`).
 *
 * Chiều đúng: `id_bai_viet_a` = môn (`mon_hoc`), `id_bai_viet_b` = ngành (`nganh_dao_tao`).
 * Không dùng `id_bai_viet_a = id_nganh` — đó là chiều của `fetchRelatedArticles` (bài A → liên quan B).
 */
export async function fetchMonHocDungTrongNganh(
  nganhArticleId: string,
): Promise<MonHocForNganhRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: edges, error: e1 } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_a")
      .eq("id_bai_viet_b", nganhArticleId)
      .eq("loai_quan_he", "DUNG_TRONG_NGANH");
    if (e1 || !edges?.length) return [];

    const ids = (edges as { id_bai_viet_a?: string }[])
      .map((row) => row.id_bai_viet_a)
      .filter(Boolean) as string[];
    if (!ids.length) return [];

    const { data: rows, error: e2 } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, tieu_de_viet")
      .in("id", ids)
      .eq("loai_bai_viet", "mon_hoc")
      .eq("trang_thai_noi_dung", "published");
    if (e2 || !rows) return [];

    return (rows as Record<string, unknown>[])
      .map((r) => ({
        id: String(r.id),
        slug: String(r.slug ?? ""),
        tieu_de: String(r.tieu_de ?? "").trim() || "Môn học",
        tieu_de_viet:
          r.tieu_de_viet == null
            ? null
            : String(r.tieu_de_viet).trim() || null,
      }))
      .sort((a, b) =>
        (a.tieu_de_viet ?? a.tieu_de).localeCompare(
          b.tieu_de_viet ?? b.tieu_de,
          "vi",
          { sensitivity: "base" },
        ),
      );
  } catch {
    return [];
  }
}

/**
 * Nghề gắn với ngành (`DUNG_TRONG_NGHE`).
 *
 * Chiều đúng: `id_bai_viet_a` = ngành (`nganh_dao_tao`), `id_bai_viet_b` = nghề (`nghe`).
 * Khác `fetchMonHocDungTrongNganh` (môn → ngành, B = ngành).
 */
export async function fetchNgheDungTrongNganh(
  nganhArticleId: string,
): Promise<NgheForNganhRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: edges, error: e1 } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_b")
      .eq("id_bai_viet_a", nganhArticleId)
      .eq("loai_quan_he", "DUNG_TRONG_NGHE");
    if (e1 || !edges?.length) return [];

    const ids = (edges as { id_bai_viet_b?: string }[])
      .map((row) => row.id_bai_viet_b)
      .filter(Boolean) as string[];
    if (!ids.length) return [];

    const { data: rows, error: e2 } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, tieu_de_viet, tom_tat, cover_id")
      .in("id", ids)
      .eq("loai_bai_viet", "nghe")
      .eq("trang_thai_noi_dung", "published");
    if (e2 || !rows) return [];

    return (rows as Record<string, unknown>[])
      .map((r) => ({
        id: String(r.id),
        slug: String(r.slug ?? ""),
        tieu_de: String(r.tieu_de ?? "").trim() || "Nghề",
        tieu_de_viet:
          r.tieu_de_viet == null
            ? null
            : String(r.tieu_de_viet).trim() || null,
        tom_tat:
          r.tom_tat == null ? null : String(r.tom_tat).trim() || null,
        cover_id:
          r.cover_id == null ? null : String(r.cover_id).trim() || null,
      }))
      .sort((a, b) =>
        (a.tieu_de_viet ?? a.tieu_de).localeCompare(
          b.tieu_de_viet ?? b.tieu_de,
          "vi",
          { sensitivity: "base" },
        ),
      );
  } catch {
    return [];
  }
}

/** Bài liên quan khi bài hiện tại là A: `id_bai_viet_a` = articleId → lấy B. Khác chiều `fetchMonHocDungTrongNganh`. */
export async function fetchRelatedArticles(
  articleId: string,
): Promise<ArticleCard[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: edges, error: e1 } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_b, loai_quan_he")
      .eq("id_bai_viet_a", articleId);
    if (e1 || !edges?.length) return [];

    const ids = edges
      .map((row: { id_bai_viet_b?: string }) => row.id_bai_viet_b)
      .filter(Boolean) as string[];
    if (!ids.length) return [];

    const { data: rows, error: e2 } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, loai_bai_viet, tom_tat")
      .in("id", ids)
      .eq("trang_thai_noi_dung", "published");
    if (e2 || !rows) return [];

    const loaiById = new Map(
      edges.map((r: { id_bai_viet_b?: string; loai_quan_he?: string }) => [
        r.id_bai_viet_b,
        r.loai_quan_he ?? null,
      ]),
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      slug: String(r.slug),
      tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
      loai_bai_viet: r.loai_bai_viet as ArticleCard["loai_bai_viet"],
      tom_tat: (r.tom_tat as string | null) ?? null,
      loai_quan_he: loaiById.get(String(r.id)) ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Cạnh `LIEN_QUAN` → bài `nghe` đã publish — inject HTML vào `[data-dynamic="related-jobs"]`.
 * `loai_quan_he` so khớp không phân biệt hoa thường.
 */
export async function fetchRelatedJobsLienQuan(
  articleId: string,
): Promise<RelatedJobLienQuanRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: edges, error: e1 } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_b, loai_quan_he")
      .eq("id_bai_viet_a", articleId);
    if (e1 || !edges?.length) return [];

    const filtered = (edges as { id_bai_viet_b?: string; loai_quan_he?: string }[]).filter(
      (row) => String(row.loai_quan_he ?? "").toUpperCase() === "LIEN_QUAN",
    );
    const ids = filtered
      .map((row) => row.id_bai_viet_b)
      .filter(Boolean) as string[];
    if (!ids.length) return [];

    const { data: rows, error: e2 } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, tom_tat, loai_bai_viet")
      .in("id", ids)
      .eq("trang_thai_noi_dung", "published");
    if (e2 || !rows) return [];

    const order = new Map(ids.map((id, i) => [id, i]));
    const ngheRows = (rows as Record<string, unknown>[]).filter(
      (r) => String(r.loai_bai_viet ?? "") === "nghe",
    );
    ngheRows.sort(
      (a, b) =>
        (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0),
    );

    return ngheRows.map((r) => ({
      slug: String(r.slug ?? ""),
      tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
      tom_tat: (r.tom_tat as string | null) ?? null,
      loai_bai_viet: String(r.loai_bai_viet ?? "nghe"),
    }));
  } catch {
    return [];
  }
}

export async function fetchTruongDaoTaoForNganh(
  articleId: string,
): Promise<TruongNganhRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const selectStr =
      "ten_chuong_trinh, he_dao_tao, thoi_gian_thang, org_to_chuc ( ten, slug, logo_id )";

    const filtered = await supabase
      .from("org_truong_nganh")
      .select(selectStr)
      .eq("id_nganh", articleId)
      .eq("trang_thai_chuong_trinh", "dang_tuyen");

    if (!filtered.error && filtered.data?.length) {
      return filtered.data as TruongNganhRow[];
    }
    if (filtered.error) {
      const { data, error } = await supabase
        .from("org_truong_nganh")
        .select(selectStr)
        .eq("id_nganh", articleId);
      if (error || !data) return [];
      return data as TruongNganhRow[];
    }
    const { data: allRows } = await supabase
      .from("org_truong_nganh")
      .select(selectStr)
      .eq("id_nganh", articleId);
    return (allRows ?? []) as TruongNganhRow[];
  } catch {
    return [];
  }
}

/**
 * Gallery tác phẩm — ưu tiên embed như brief; lỗi FK/embed → fallback tối thiểu.
 */
export async function fetchTacPhamGalleryForArticle(
  articleId: string,
): Promise<TacPhamGalleryItem[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_gan_tac_pham")
      .select(
        `
        content_tac_pham (
          id,
          tieu_de,
          cover_id,
          loai_tac_pham,
          user_nguoi_dung ( slug, ten_hien_thi )
        )
      `,
      )
      .eq("id_bai_viet", articleId)
      .limit(6);

    if (!error && data?.length) {
      const out: TacPhamGalleryItem[] = [];
      for (const row of data as { content_tac_pham?: unknown }[]) {
        const w = row.content_tac_pham as
          | {
              id: string;
              tieu_de?: string | null;
              cover_id?: string | null;
              loai_tac_pham?: string | null;
              user_nguoi_dung?: {
                slug?: string | null;
                ten_hien_thi?: string | null;
              } | null;
            }
          | null
          | undefined;
        if (!w?.id) continue;
        out.push({
          id: String(w.id),
          tieu_de: w.tieu_de,
          cover_id: w.cover_id,
          loai_tac_pham: w.loai_tac_pham ?? null,
          author_slug: w.user_nguoi_dung?.slug ?? null,
          author_name: w.user_nguoi_dung?.ten_hien_thi ?? null,
        });
      }
      if (out.length) return out;
    }
  } catch {
    /* fall through */
  }

  const stubs = await fetchTacPhamLinked(articleId);
  return stubs.map((s) => ({
    id: s.id,
    tieu_de: s.tieu_de,
    cover_id: null,
    loai_tac_pham: null,
    author_slug: null,
    author_name: null,
  }));
}

/** Tác phẩm gắn tag (article) — schema có thể khác tên bảng/cột; lỗi → rỗng */
export async function fetchTacPhamLinked(
  articleId: string,
): Promise<TacPhamStub[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: links, error: e1 } = await supabase
      .from("article_gan_tac_pham")
      .select("id_tac_pham")
      .eq("id_bai_viet", articleId);
    if (e1 || !links?.length) return [];

    const ids = links
      .map((r: { id_tac_pham?: string }) => r.id_tac_pham)
      .filter(Boolean) as string[];
    if (!ids.length) return [];

    const { data: works, error: e2 } = await supabase
      .from("content_tac_pham")
      .select("id, slug, tieu_de")
      .in("id", ids)
      .limit(24);
    if (e2 || !works) return [];
    return works as TacPhamStub[];
  } catch {
    return [];
  }
}

/** Cột mốc gắn tag — lỗi schema → rỗng */
export async function fetchCotMocLinked(
  articleId: string,
): Promise<CotMocStub[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: links, error: e1 } = await supabase
      .from("article_gan_cot_moc")
      .select("id_cot_moc")
      .eq("id_bai_viet", articleId);
    if (e1 || !links?.length) return [];

    const ids = links
      .map((r: { id_cot_moc?: string }) => r.id_cot_moc)
      .filter(Boolean) as string[];
    if (!ids.length) return [];

    const { data: rows, error: e2 } = await supabase
      .from("content_cot_moc")
      .select("id, slug, tieu_de")
      .in("id", ids)
      .limit(24);
    if (e2 || !rows) return [];
    return rows as CotMocStub[];
  } catch {
    return [];
  }
}

export type ListArticlesResult =
  | { ok: true; items: ArticleListItem[] }
  | { ok: false; items: []; reason: "no_env" | "query_error"; message?: string };

/**
 * Danh sách bài public — chỉ `published` (brief public-facing).
 */
export async function listArticlesForPublicIndex(options?: {
  loai?: string;
  limit?: number;
}): Promise<ListArticlesResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, items: [], reason: "no_env" };
  }
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
  try {
    const supabase = createPublicSupabaseClient();
    let q = supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, loai_bai_viet, tom_tat, cap_nhat_luc, luot_xem, trang_thai_noi_dung",
      )
      .eq("trang_thai_noi_dung", "published")
      .order("cap_nhat_luc", { ascending: false })
      .limit(limit);
    if (options?.loai?.trim()) {
      q = q.eq("loai_bai_viet", options.loai.trim());
    }
    const { data, error } = await q;
    if (error) {
      return {
        ok: false,
        items: [],
        reason: "query_error",
        message: error.message,
      };
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    const items: ArticleListItem[] = rows.map((r) => ({
      id: String(r.id),
      slug: String(r.slug ?? ""),
      tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
      loai_bai_viet: String(r.loai_bai_viet ?? "blog"),
      tom_tat: (r.tom_tat as string | null) ?? null,
      cap_nhat_luc: String(r.cap_nhat_luc ?? ""),
      luot_xem: Number(r.luot_xem ?? 0),
      trang_thai_noi_dung: String(r.trang_thai_noi_dung ?? ""),
    }));
    return { ok: true, items };
  } catch (e) {
    return {
      ok: false,
      items: [],
      reason: "query_error",
      message: describeFetchFailure(e),
    };
  }
}

export type ListNgheArticlesResult =
  | { ok: true; items: NgheArticleHubRow[] }
  | { ok: false; items: []; reason: "no_env" | "query_error"; message?: string };

/** Cột FK bài nghe → `article_nhom` (thử lần lượt — PostgREST lỗi nếu cột không tồn tại). */
const ARTICLE_BAI_VIET_NHOM_FK_COLUMNS = [
  "id_article_nhom",
  "article_nhom_id",
  "id_nhom",
  "nhom_id",
] as const;

const NGHE_HUB_BASE_SELECT =
  "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, cover_id, id_linh_vuc";

const NGHE_HUB_WITH_LINH_VUC_SELECT = `${NGHE_HUB_BASE_SELECT}, linh_vuc:id_linh_vuc(id, slug, ten)`;

function pickArticleNhomFkFromRow(r: Record<string, unknown>): string | null {
  for (const k of ARTICLE_BAI_VIET_NHOM_FK_COLUMNS) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function mapNgheArticleHubRow(r: Record<string, unknown>): NgheArticleHubRow {
  const embed = parseLinhVucEmbed(r.linh_vuc);
  const idLvRaw = r.id_linh_vuc;
  const idLv =
    idLvRaw != null && String(idLvRaw).trim() !== ""
      ? String(idLvRaw).trim()
      : (embed?.id ?? null);
  const slug = embed?.slug?.trim() || null;
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
    tieu_de_viet:
      r.tieu_de_viet == null || r.tieu_de_viet === ""
        ? null
        : String(r.tieu_de_viet).trim() || null,
    tieu_de_eng: (r.tieu_de_eng as string | null) ?? null,
    tom_tat: (r.tom_tat as string | null) ?? null,
    cover_id: (r.cover_id as string | null) ?? null,
    article_nhom_id: pickArticleNhomFkFromRow(r),
    id_linh_vuc: idLv,
    linh_vuc: embed ?? (idLv ? { id: idLv, slug: slug ?? "", ten: "Lĩnh vực" } : null),
    linh_vuc_id: idLv ? [idLv] : null,
    linh_vuc_slugs: slug ? [slug] : null,
  };
}

/** Bổ sung embed `linh_vuc` khi chỉ có `id_linh_vuc` (select không embed được). */
async function attachLinhVucEmbedIfMissing(
  articles: NgheArticleHubRow[],
): Promise<NgheArticleHubRow[]> {
  const missingIds = [
    ...new Set(
      articles
        .filter((a) => a.id_linh_vuc && !a.linh_vuc?.ten)
        .map((a) => a.id_linh_vuc as string),
    ),
  ];
  if (!missingIds.length) return articles;

  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("linh_vuc")
    .select("id, slug, ten")
    .in("id", missingIds);
  const byId = new Map<string, LinhVucEmbed>();
  for (const row of (data as { id?: string; slug?: string; ten?: string }[] | null) ??
    []) {
    const embed = parseLinhVucEmbed(row);
    if (embed) byId.set(embed.id, embed);
  }

  return articles.map((a) => {
    const id = a.id_linh_vuc?.trim();
    if (!id) return a;
    const embed = a.linh_vuc?.ten ? a.linh_vuc : (byId.get(id) ?? a.linh_vuc);
    const slug = embed?.slug?.trim();
    return {
      ...a,
      linh_vuc: embed ?? a.linh_vuc,
      linh_vuc_slugs: slug ? [slug] : a.linh_vuc_slugs,
    };
  });
}

type ArticleNhomEmbedRow = NonNullable<NgheArticleHubRow["article_nhom"]>;

function parseArticleNhomRow(r: {
  id?: string;
  slug?: string;
  ten?: string;
  mo_ta?: string | null;
  thu_tu?: number | null;
  loai_nhom?: string;
}): ArticleNhomEmbedRow | null {
  const id = String(r.id ?? "").trim();
  if (!id) return null;
  const thuTu = Number(r.thu_tu ?? 0);
  return {
    id,
    slug: String(r.slug ?? "").trim(),
    ten: String(r.ten ?? "").trim() || "Nhóm",
    mo_ta: (r.mo_ta as string | null) ?? null,
    thu_tu: Number.isFinite(thuTu) ? thuTu : 0,
    loai_nhom: String(r.loai_nhom ?? ""),
  };
}

function sortNhomEmbeds(a: ArticleNhomEmbedRow, b: ArticleNhomEmbedRow): number {
  if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
  return a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" });
}

/**
 * Junction `article_gan_nhom` (id_bai_viet, id_nhom) + embed `article_nhom`.
 * Giữ `article_nhom_all` để hub chọn nhóm đúng lĩnh vực khi một bài có nhiều nhóm.
 */
export async function attachArticleNhomFromGanNhom(
  articles: NgheArticleHubRow[],
): Promise<NgheArticleHubRow[]> {
  if (!articles.length) return articles;

  const supabase = createPublicSupabaseClient();
  const ids = articles.map((a) => a.id);

  const linksByBai = new Map<string, string[]>();
  const { data: ganRows, error: ganErr } = await supabase
    .from("article_gan_nhom")
    .select("id_bai_viet, id_nhom")
    .in("id_bai_viet", ids);

  if (!ganErr && ganRows?.length) {
    for (const row of ganRows as { id_bai_viet?: string; id_nhom?: string }[]) {
      const baiId = String(row.id_bai_viet ?? "").trim();
      const nhomId = String(row.id_nhom ?? "").trim();
      if (!baiId || !nhomId) continue;
      const arr = linksByBai.get(baiId) ?? [];
      if (!arr.includes(nhomId)) arr.push(nhomId);
      linksByBai.set(baiId, arr);
    }
  }

  const nhomIdSet = new Set<string>([...linksByBai.values()].flat());
  for (const a of articles) {
    if (a.article_nhom_id?.trim()) nhomIdSet.add(a.article_nhom_id.trim());
  }
  if (!nhomIdSet.size) {
    return articles.map((a) => ({
      ...a,
      article_nhom: null,
      article_nhom_all: null,
    }));
  }

  const { data: nhomRows, error: nhomErr } = await supabase
    .from("article_nhom")
    .select("id, slug, ten, mo_ta, thu_tu, loai_nhom")
    .in("id", [...nhomIdSet]);

  const nhomById = new Map<string, ArticleNhomEmbedRow>();
  if (!nhomErr && nhomRows?.length) {
    for (const r of nhomRows as Parameters<typeof parseArticleNhomRow>[0][]) {
      const embed = parseArticleNhomRow(r);
      if (embed) nhomById.set(embed.id, embed);
    }
  }

  return articles.map((a) => {
    const fromGan = (linksByBai.get(a.id) ?? [])
      .map((nid) => nhomById.get(nid))
      .filter((x): x is ArticleNhomEmbedRow => x != null)
      .sort(sortNhomEmbeds);

    const fkId = a.article_nhom_id?.trim();
    const fromFk =
      fkId && !fromGan.some((n) => n.id === fkId)
        ? (nhomById.get(fkId) ?? null)
        : null;

    const all = fromFk ? [...fromGan, fromFk].sort(sortNhomEmbeds) : fromGan;
    const primary = all[0] ?? fromFk;

    return {
      ...a,
      article_nhom_all: all.length ? all : null,
      article_nhom_id: primary?.id ?? a.article_nhom_id ?? null,
      article_nhom: primary ?? null,
    };
  });
}

/**
 * Danh sách bài nghề (`loai_bai_viet = nghe`, `published`) cho hub `/nghe-nghiep`.
 * Lọc lĩnh vực qua `article_bai_viet.id_linh_vuc` (không qua `article_gan_nhom`).
 */
export async function listNgheArticlesForHub(options?: {
  limit?: number;
  linhVucId?: string;
}): Promise<ListNgheArticlesResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, items: [], reason: "no_env" };
  }
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 500);
  const linhVucId = options?.linhVucId?.trim() ?? "";
  try {
    const supabase = createPublicSupabaseClient();

    const runList = async (select: string) => {
      let q = supabase
        .from("article_bai_viet")
        .select(select)
        .eq("loai_bai_viet", "nghe")
        .eq("trang_thai_noi_dung", "published")
        .order("tieu_de", { ascending: true })
        .limit(limit);
      if (linhVucId) q = q.eq("id_linh_vuc", linhVucId);
      return q;
    };

    let rows: Record<string, unknown>[] | null = null;

    const withEmbed = await runList(NGHE_HUB_WITH_LINH_VUC_SELECT);
    if (!withEmbed.error && withEmbed.data != null) {
      rows = withEmbed.data as unknown as Record<string, unknown>[];
    } else {
      const plain = await runList(NGHE_HUB_BASE_SELECT);
      if (plain.error) {
        return {
          ok: false,
          items: [],
          reason: "query_error",
          message: plain.error.message,
        };
      }
      rows = (plain.data ?? []) as unknown as Record<string, unknown>[];
    }

    let base = rows.map(mapNgheArticleHubRow);
    base = await attachLinhVucEmbedIfMissing(base);
    const items = await attachArticleNhomFromGanNhom(base);
    return { ok: true, items };
  } catch (e) {
    return {
      ok: false,
      items: [],
      reason: "query_error",
      message: describeFetchFailure(e),
    };
  }
}
