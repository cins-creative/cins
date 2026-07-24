import { resolveHubArticleThumbSync } from "@/lib/bai-viet/thumbnail";
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
  const main_video =
    typeof raw.main_video === "string"
      ? raw.main_video.trim() || null
      : null;
  return {
    ...(raw as unknown as ArticleBaiViet),
    tieu_de,
    noi_dung,
    main_video,
    tieu_de_viet:
      raw.tieu_de_viet === undefined || raw.tieu_de_viet === null
        ? null
        : String(raw.tieu_de_viet).trim() || null,
  };
}

export function parseLinhVucEmbed(raw: unknown): LinhVucEmbed | null {
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

export async function getKeywordArticleBySlug(
  slug: string,
): Promise<ArticleBaiViet | null> {
  const article = await getArticleBySlug(slug);
  if (!article || article.loai_bai_viet !== "keyword") return null;
  if (
    article.trang_thai_noi_dung !== "published" &&
    article.trang_thai_noi_dung !== "merged"
  ) {
    return null;
  }
  return article;
}

export async function getPhanMemArticleBySlug(
  slug: string,
): Promise<ArticleBaiViet | null> {
  const article = await getArticleBySlug(slug);
  if (!article || article.loai_bai_viet !== "phan_mem") return null;
  if (
    article.trang_thai_noi_dung !== "published" &&
    article.trang_thai_noi_dung !== "merged"
  ) {
    return null;
  }
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

export type MonHocCapDoValue = "dai_cuong" | "co_so" | "chuyen_nganh";

export type MonHocForNganhRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  cap_do: MonHocCapDoValue | null;
  cover_id: string | null;
  tom_tat: string | null;
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
      .select("id_bai_viet_a, cap_do")
      .eq("id_bai_viet_b", nganhArticleId)
      .eq("loai_quan_he", "DUNG_TRONG_NGANH");
    if (e1 || !edges?.length) return [];

    const capByMonId = new Map<string, MonHocCapDoValue | null>();
    for (const row of edges as { id_bai_viet_a?: string; cap_do?: string | null }[]) {
      const id = row.id_bai_viet_a?.trim();
      if (!id || capByMonId.has(id)) continue;
      const cap = row.cap_do?.trim();
      capByMonId.set(
        id,
        cap === "dai_cuong" || cap === "co_so" || cap === "chuyen_nganh"
          ? cap
          : null,
      );
    }

    const ids = [...capByMonId.keys()];
    if (!ids.length) return [];

    const { data: rows, error: e2 } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, tieu_de_viet, cover_id, tom_tat")
      .in("id", ids)
      .eq("loai_bai_viet", "mon_hoc")
      .eq("trang_thai_noi_dung", "published");
    if (e2 || !rows) return [];

    const capOrder: Record<MonHocCapDoValue, number> = {
      dai_cuong: 0,
      co_so: 1,
      chuyen_nganh: 2,
    };

    return (rows as Record<string, unknown>[])
      .map((r) => {
        const id = String(r.id);
        return {
          id,
          slug: String(r.slug ?? ""),
          tieu_de: String(r.tieu_de ?? "").trim() || "Môn học",
          tieu_de_viet:
            r.tieu_de_viet == null
              ? null
              : String(r.tieu_de_viet).trim() || null,
          cap_do: capByMonId.get(id) ?? null,
          cover_id:
            r.cover_id == null ? null : String(r.cover_id).trim() || null,
          tom_tat: (r.tom_tat as string | null)?.trim() || null,
        };
      })
      .sort((a, b) => {
        const ca = a.cap_do ? capOrder[a.cap_do] : 1;
        const cb = b.cap_do ? capOrder[b.cap_do] : 1;
        if (ca !== cb) return ca - cb;
        return (a.tieu_de_viet ?? a.tieu_de).localeCompare(
          b.tieu_de_viet ?? b.tieu_de,
          "vi",
          { sensitivity: "base" },
        );
      });
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
      .select("id_bai_viet_b, loai_quan_he, cap_do")
      .eq("id_bai_viet_a", articleId);
    if (e1 || !edges?.length) return [];

    const ids = edges
      .map((row: { id_bai_viet_b?: string }) => row.id_bai_viet_b)
      .filter(Boolean) as string[];
    if (!ids.length) return [];

    const { data: rows, error: e2 } = await supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, loai_bai_viet, tom_tat, cover_id, thumbnail, meta, id_linh_vuc, linh_vuc:id_linh_vuc(id, slug, ten)",
      )
      .in("id", ids)
      .eq("trang_thai_noi_dung", "published");
    if (e2 || !rows) return [];

    type EdgeRow = {
      id_bai_viet_b?: string;
      loai_quan_he?: string;
      cap_do?: string | null;
    };
    const edgeById = new Map(
      (edges as EdgeRow[]).map((r) => [r.id_bai_viet_b, r]),
    );

    const mapped = rows.map((r: Record<string, unknown>) => {
      const id = String(r.id);
      const edge = edgeById.get(id);
      return {
        id,
        slug: String(r.slug),
        tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
        loai_bai_viet: r.loai_bai_viet as ArticleCard["loai_bai_viet"],
        tom_tat: (r.tom_tat as string | null) ?? null,
        loai_quan_he: edge?.loai_quan_he ?? null,
        cap_do: edge?.cap_do?.trim() || null,
        linh_vuc: parseLinhVucEmbed(r.linh_vuc),
        cover_id: r.cover_id == null ? null : String(r.cover_id).trim() || null,
        thumbnail:
          r.thumbnail == null ? null : String(r.thumbnail).trim() || null,
        meta: (r.meta as ArticleCard["meta"]) ?? null,
      };
    });

    return mapped.map((card) => ({
      ...card,
      thumb_url: resolveHubArticleThumbSync({
        thumbnail: card.thumbnail,
        cover_id: card.cover_id,
      }),
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

/** Tác phẩm mới từ cộng đồng — fallback khi bài chưa gắn `article_gan_tac_pham`. */
export async function fetchRecentTacPhamGallery(
  limit = 6,
): Promise<TacPhamGalleryItem[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("content_tac_pham")
      .select(
        `
        id,
        tieu_de,
        cover_id,
        loai_tac_pham,
        user_nguoi_dung ( slug, ten_hien_thi )
      `,
      )
      .order("tao_luc", { ascending: false })
      .limit(limit);

    if (error || !data?.length) return [];

    const out: TacPhamGalleryItem[] = [];
    for (const row of data as Record<string, unknown>[]) {
      const u = row.user_nguoi_dung as
        | { slug?: string | null; ten_hien_thi?: string | null }
        | null
        | undefined;
      const id = String(row.id ?? "");
      if (!id) continue;
      out.push({
        id,
        tieu_de: (row.tieu_de as string | null) ?? null,
        cover_id: (row.cover_id as string | null) ?? null,
        loai_tac_pham: (row.loai_tac_pham as string | null) ?? null,
        author_slug: u?.slug ?? null,
        author_name: u?.ten_hien_thi ?? null,
      });
    }
    return out;
  } catch {
    return [];
  }
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
  "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, meta_description, cover_id, thumbnail, id_linh_vuc";

const NGHE_HUB_WITH_LINH_VUC_SELECT = `${NGHE_HUB_BASE_SELECT}, linh_vuc:id_linh_vuc(id, slug, ten)`;

const NGHE_HUB_WITH_NHOM_EMBED = `${NGHE_HUB_WITH_LINH_VUC_SELECT}, article_gan_nhom(id_nhom, article_nhom(id, slug, ten, mo_ta, thu_tu, loai_nhom))`;

function escapeIlikePattern(q: string): string {
  return q.replace(/[%_\\]/g, "\\$&");
}

function pickArticleNhomFkFromRow(r: Record<string, unknown>): string | null {
  for (const k of ARTICLE_BAI_VIET_NHOM_FK_COLUMNS) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

/** Map row hub bài viết — dùng chung hub nghe + ngành. */
export function mapNgheArticleHubRow(r: Record<string, unknown>): NgheArticleHubRow {
  const embed = parseLinhVucEmbed(r.linh_vuc);
  const idLvRaw = r.id_linh_vuc;
  const idLv =
    idLvRaw != null && String(idLvRaw).trim() !== ""
      ? String(idLvRaw).trim()
      : (embed?.id ?? null);
  const slug = embed?.slug?.trim() || null;

  const gan = r.article_gan_nhom;
  const nhomMap = new Map<string, ArticleNhomEmbedRow>();
  if (Array.isArray(gan)) {
    for (const link of gan) {
      if (!link || typeof link !== "object") continue;
      const l = link as Record<string, unknown>;
      const nhRaw = l.article_nhom;
      const nhObj = Array.isArray(nhRaw) ? nhRaw[0] : nhRaw;
      const embedNhom = parseArticleNhomRow(
        (nhObj ?? {}) as Parameters<typeof parseArticleNhomRow>[0],
      );
      const nhomId = embedNhom?.id ?? String(l.id_nhom ?? "").trim();
      if (embedNhom && nhomId) nhomMap.set(nhomId, embedNhom);
    }
  }
  const fromGan = [...nhomMap.values()].sort(sortNhomEmbeds);
  const fkId = pickArticleNhomFkFromRow(r);
  const primary = fromGan[0] ?? null;

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
    meta_description: (r.meta_description as string | null) ?? null,
    cover_id: (r.cover_id as string | null) ?? null,
    thumbnail: (r.thumbnail as string | null) ?? null,
    article_nhom_id: primary?.id ?? fkId,
    article_nhom: primary,
    article_nhom_all: fromGan.length ? fromGan : null,
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
/** Đếm số bài nghề đã publish — dùng cho stats (rẻ hơn kéo full rows). */
export async function countNgheArticlesForHub(): Promise<number> {
  if (!hasSupabaseEnv()) return 0;
  try {
    const supabase = createPublicSupabaseClient();
    const { count } = await supabase
      .from("article_bai_viet")
      .select("id", { count: "exact", head: true })
      .eq("loai_bai_viet", "nghe")
      .eq("trang_thai_noi_dung", "published");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listNgheArticlesForHub(options?: {
  limit?: number;
  linhVucId?: string;
  q?: string;
}): Promise<ListNgheArticlesResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, items: [], reason: "no_env" };
  }
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 500);
  const linhVucId = options?.linhVucId?.trim() ?? "";
  const searchText = options?.q?.trim() ?? "";
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
      if (linhVucId && !searchText) q = q.eq("id_linh_vuc", linhVucId);
      if (searchText) {
        const esc = escapeIlikePattern(searchText);
        q = q.or(
          `tieu_de.ilike.%${esc}%,slug.ilike.%${esc}%,tieu_de_viet.ilike.%${esc}%,tieu_de_eng.ilike.%${esc}%,tom_tat.ilike.%${esc}%,meta_description.ilike.%${esc}%`,
        );
      }
      return q;
    };

    let rows: Record<string, unknown>[] | null = null;
    let hasNhomEmbed = false;

    const withNhom = await runList(NGHE_HUB_WITH_NHOM_EMBED);
    if (!withNhom.error && withNhom.data != null) {
      rows = withNhom.data as unknown as Record<string, unknown>[];
      hasNhomEmbed = true;
    } else {
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
    }

    let base = rows.map(mapNgheArticleHubRow);
    base = await attachLinhVucEmbedIfMissing(base);
    const items = hasNhomEmbed
      ? base
      : await attachArticleNhomFromGanNhom(base);
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
