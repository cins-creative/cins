import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { describeFetchFailure } from "@/lib/supabase/errors";
import type {
  ArticleBaiViet,
  ArticleCard,
  ArticleListItem,
  CotMocStub,
  NgheArticleHubRow,
  TacPhamGalleryItem,
  TacPhamStub,
  TruongNganhRow,
} from "@/lib/articles/types";

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
  };
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleBaiViet | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return normalizeArticleRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
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

async function attachLinhVucIdsToNgheArticles(
  articles: NgheArticleHubRow[],
): Promise<NgheArticleHubRow[]> {
  if (!articles.length) return articles;

  const supabase = createPublicSupabaseClient();
  const ids = articles.map((a) => a.id);

  const { data: edges, error: e1 } = await supabase
    .from("article_lien_quan")
    .select("id_bai_viet_a, id_bai_viet_b")
    .in("id_bai_viet_a", ids);
  if (e1 || !edges?.length) return articles;

  const relatedIds = [
    ...new Set(
      edges
        .map((row: { id_bai_viet_b?: string }) => row.id_bai_viet_b)
        .filter(Boolean) as string[],
    ),
  ];
  if (!relatedIds.length) return articles;

  const [{ data: relatedArticles }, { data: linhVucs }] = await Promise.all([
    supabase
      .from("article_bai_viet")
      .select("id, slug, loai_bai_viet")
      .in("id", relatedIds)
      .eq("loai_bai_viet", "linh_vuc")
      .eq("trang_thai_noi_dung", "published"),
    supabase.from("lv_linh_vuc").select("id, slug"),
  ]);

  const lvBySlug = new Map<string, string>();
  for (const lv of linhVucs ?? []) {
    const slug = String(lv.slug ?? "").trim();
    const id = String(lv.id ?? "");
    if (slug && id) lvBySlug.set(slug, id);
  }
  const linhArticleById = new Map(
    (relatedArticles ?? []).map((r: { id?: string; slug?: string | null }) => [
      String(r.id),
      String(r.slug ?? "").trim(),
    ]),
  );

  const lvIdsByArticle = new Map<string, string[]>();
  for (const edge of edges) {
    const aId = String(edge.id_bai_viet_a ?? "");
    const bId = String(edge.id_bai_viet_b ?? "");
    const slug = linhArticleById.get(bId);
    if (!slug) continue;
    const lvId = lvBySlug.get(slug);
    if (!lvId) continue;
    const arr = lvIdsByArticle.get(aId) ?? [];
    if (!arr.includes(lvId)) arr.push(lvId);
    lvIdsByArticle.set(aId, arr);
  }

  return articles.map((a) => ({
    ...a,
    linh_vuc_id: lvIdsByArticle.get(a.id) ?? null,
  }));
}

/**
 * Danh sách bài nghề (`loai_bai_viet = nghe`, `published`) cho hub `/nghe-nghiep`.
 */
export async function listNgheArticlesForHub(options?: {
  limit?: number;
}): Promise<ListNgheArticlesResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, items: [], reason: "no_env" };
  }
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 500);
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, tieu_de_eng, tom_tat, cover_id")
      .eq("loai_bai_viet", "nghe")
      .eq("trang_thai_noi_dung", "published")
      .order("tieu_de", { ascending: true })
      .limit(limit);
    if (error) {
      return {
        ok: false,
        items: [],
        reason: "query_error",
        message: error.message,
      };
    }

    const base: NgheArticleHubRow[] = (data ?? []).map(
      (r: Record<string, unknown>) => ({
        id: String(r.id),
        slug: String(r.slug ?? ""),
        tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
        tieu_de_eng: (r.tieu_de_eng as string | null) ?? null,
        tom_tat: (r.tom_tat as string | null) ?? null,
        cover_id: (r.cover_id as string | null) ?? null,
        linh_vuc_id: null,
      }),
    );

    const items = await attachLinhVucIdsToNgheArticles(base);
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
