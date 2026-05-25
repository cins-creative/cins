import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import {
  parseArticleNhomRow,
  pickNhomByLoai,
  sortNhomEmbeds,
  type ArticleNhomEmbedRow,
} from "@/lib/bai-viet/nhom-embed";
import {
  BAI_VIET_HUB_LOAI,
  BAI_VIET_HUB_LOAI_IDS,
  isHubLoaiId,
} from "@/lib/bai-viet/hub-loai";
import type {
  BlogExploreLink,
  BlogHubFilterNhom,
  BlogHubLoaiTab,
  BlogHubResult,
  BlogHubRow,
  BlogRelatedCard,
} from "@/lib/bai-viet/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";

const HUB_SELECT =
  "id, slug, loai_bai_viet, tieu_de, tieu_de_eng, tom_tat, cover_id, thumbnail, luot_xem, tao_luc, cap_nhat_luc";

type RawBlog = {
  id: string;
  slug: string;
  loai_bai_viet: string;
  tieu_de: string;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  cover_id: string | null;
  thumbnail: string | null;
  luot_xem: number;
  tao_luc: string;
  cap_nhat_luc: string;
};

function mapRawBlog(r: Record<string, unknown>): RawBlog | null {
  const id = String(r.id ?? "").trim();
  const slug = String(r.slug ?? "").trim();
  const tieu_de = String(r.tieu_de ?? "").trim();
  if (!id || !slug || !tieu_de) return null;
  return {
    id,
    slug,
    loai_bai_viet: String(r.loai_bai_viet ?? "").trim() || "blog",
    tieu_de,
    tieu_de_eng:
      r.tieu_de_eng == null ? null : String(r.tieu_de_eng).trim() || null,
    tom_tat: r.tom_tat == null ? null : String(r.tom_tat).trim() || null,
    cover_id: r.cover_id == null ? null : String(r.cover_id).trim() || null,
    thumbnail: r.thumbnail == null ? null : String(r.thumbnail).trim() || null,
    luot_xem: typeof r.luot_xem === "number" ? r.luot_xem : 0,
    tao_luc: String(r.tao_luc ?? ""),
    cap_nhat_luc: String(r.cap_nhat_luc ?? r.tao_luc ?? ""),
  };
}

function mapRowWithNhom(
  row: RawBlog,
  nhom: ArticleNhomEmbedRow[] | null,
  images: { thumb_url: string | null; cover_url: string | null },
): BlogHubRow {
  return {
    ...row,
    cover_url: images.cover_url,
    thumb_url: images.thumb_url,
    article_nhom_all: nhom,
    bo_phan: pickNhomByLoai(nhom, "bo_phan"),
    cap_do: pickNhomByLoai(nhom, "cap_do"),
    ky_thuat: pickNhomByLoai(nhom, "ky_thuat"),
  };
}

async function loadLoaiTabsWithCounts(): Promise<BlogHubLoaiTab[]> {
  const supabase = createPublicSupabaseClient();
  const tabs = await Promise.all(
    BAI_VIET_HUB_LOAI.map(async (loai) => {
      const { count, error } = await supabase
        .from("article_bai_viet")
        .select("id", { count: "exact", head: true })
        .eq("loai_bai_viet", loai.id)
        .eq("trang_thai_noi_dung", "published");
      return {
        id: loai.id,
        label: loai.label,
        dotClass: loai.dotClass,
        count: error ? 0 : (count ?? 0),
      };
    }),
  );
  return tabs;
}

async function attachNhomToBlogRows(rows: RawBlog[]): Promise<BlogHubRow[]> {
  if (!rows.length) return [];
  const supabase = createPublicSupabaseClient();
  const ids = rows.map((r) => r.id);

  const linksByBai = new Map<string, string[]>();
  const { data: ganRows } = await supabase
    .from("article_gan_nhom")
    .select("id_bai_viet, id_nhom")
    .in("id_bai_viet", ids);

  for (const row of ganRows ?? []) {
    const baiId = String((row as { id_bai_viet?: string }).id_bai_viet ?? "").trim();
    const nhomId = String((row as { id_nhom?: string }).id_nhom ?? "").trim();
    if (!baiId || !nhomId) continue;
    const arr = linksByBai.get(baiId) ?? [];
    if (!arr.includes(nhomId)) arr.push(nhomId);
    linksByBai.set(baiId, arr);
  }

  const nhomIdSet = new Set([...linksByBai.values()].flat());
  const nhomById = new Map<string, ArticleNhomEmbedRow>();
  if (nhomIdSet.size) {
    const { data: nhomRows } = await supabase
      .from("article_nhom")
      .select("id, slug, ten, mo_ta, thu_tu, loai_nhom")
      .in("id", [...nhomIdSet]);
    for (const r of nhomRows ?? []) {
      const embed = parseArticleNhomRow(r as Parameters<typeof parseArticleNhomRow>[0]);
      if (embed) nhomById.set(embed.id, embed);
    }
  }

  return Promise.all(
    rows.map(async (row) => {
      const all = (linksByBai.get(row.id) ?? [])
        .map((nid) => nhomById.get(nid))
        .filter((x): x is ArticleNhomEmbedRow => x != null)
        .sort(sortNhomEmbeds);
      const images = await resolveHubArticleImages(row);
      return mapRowWithNhom(row, all.length ? all : null, images);
    }),
  );
}

async function loadFilterNhoms(loai: string): Promise<BlogHubFilterNhom[]> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("article_nhom")
    .select("id, slug, ten, loai_nhom, thu_tu")
    .eq("loai_nhom", loai)
    .order("thu_tu", { ascending: true });
  return (data ?? [])
    .map((r) => {
      const row = r as {
        slug?: string;
        ten?: string;
        loai_nhom?: string;
        thu_tu?: number;
      };
      const slug = row.slug?.trim();
      if (!slug) return null;
      return {
        slug,
        ten: String(row.ten ?? "").trim() || slug,
        loai_nhom: String(row.loai_nhom ?? loai),
        thu_tu: Number(row.thu_tu ?? 0),
      };
    })
    .filter((x): x is BlogHubFilterNhom => x != null);
}

async function baiIdsForNhomSlug(slug: string): Promise<string[] | null> {
  const supabase = createPublicSupabaseClient();
  const { data: nhom } = await supabase
    .from("article_nhom")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  const nhomId = (nhom as { id?: string } | null)?.id?.trim();
  if (!nhomId) return [];

  const { data: links } = await supabase
    .from("article_gan_nhom")
    .select("id_bai_viet")
    .eq("id_nhom", nhomId);
  return (links ?? [])
    .map((l) => String((l as { id_bai_viet?: string }).id_bai_viet ?? "").trim())
    .filter(Boolean);
}

export async function listBlogHub(options?: {
  loai?: string;
  capDoSlug?: string;
  q?: string;
  offset?: number;
  limit?: number;
}): Promise<BlogHubResult> {
  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      items: [],
      total: 0,
      loaiTabs: [],
      capDoOptions: [],
      latestUpdate: null,
      message: "Supabase chưa cấu hình.",
    };
  }

  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 48);
  const offset = Math.max(options?.offset ?? 0, 0);
  const q = options?.q?.trim() ?? "";
  const loaiFilter = isHubLoaiId(options?.loai) ? options.loai : null;

  try {
    const supabase = createPublicSupabaseClient();
    const [loaiTabs, capDoOptions] = await Promise.all([
      loadLoaiTabsWithCounts(),
      loadFilterNhoms("cap_do"),
    ]);

    let idFilter: string[] | null = null;
    if (options?.capDoSlug?.trim()) {
      const capIds = await baiIdsForNhomSlug(options.capDoSlug.trim());
      if (!capIds?.length) {
        return {
          ok: true,
          items: [],
          total: 0,
          loaiTabs,
          capDoOptions,
          latestUpdate: null,
        };
      }
      idFilter = capIds;
    }

    let query = supabase
      .from("article_bai_viet")
      .select(HUB_SELECT, { count: "exact" })
      .in("loai_bai_viet", BAI_VIET_HUB_LOAI_IDS)
      .eq("trang_thai_noi_dung", "published")
      .order("tao_luc", { ascending: false });

    if (loaiFilter) query = query.eq("loai_bai_viet", loaiFilter);

    if (idFilter?.length) query = query.in("id", idFilter);
    if (q) {
      const esc = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(`tieu_de.ilike.%${esc}%,tom_tat.ilike.%${esc}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return {
        ok: false,
        items: [],
        total: 0,
        loaiTabs,
        capDoOptions,
        latestUpdate: null,
        message: error.message,
      };
    }

    const raw = (data ?? [])
      .map((r) => mapRawBlog(r as Record<string, unknown>))
      .filter((x): x is RawBlog => x != null);

    const items = await attachNhomToBlogRows(raw);
    const latestUpdate = items[0]?.tao_luc ?? null;

    return {
      ok: true,
      items,
      total: count ?? items.length,
      loaiTabs,
      capDoOptions,
      latestUpdate,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tải danh sách bài viết.";
    return {
      ok: false,
      items: [],
      total: 0,
      loaiTabs: [],
      capDoOptions: [],
      latestUpdate: null,
      message: msg,
    };
  }
}

export async function fetchBlogRelatedArticles(
  articleId: string,
  limit = 4,
): Promise<BlogRelatedCard[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: edgesA } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_b, loai_quan_he")
      .eq("id_bai_viet_a", articleId)
      .eq("loai_quan_he", "bai_viet_lien_quan");

    const { data: edgesB } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_a, loai_quan_he")
      .eq("id_bai_viet_b", articleId)
      .eq("loai_quan_he", "bai_viet_lien_quan");

    const idSet = new Set<string>();
    for (const e of edgesA ?? []) {
      const id = String((e as { id_bai_viet_b?: string }).id_bai_viet_b ?? "").trim();
      if (id && id !== articleId) idSet.add(id);
    }
    for (const e of edgesB ?? []) {
      const id = String((e as { id_bai_viet_a?: string }).id_bai_viet_a ?? "").trim();
      if (id && id !== articleId) idSet.add(id);
    }
    const ids = [...idSet].slice(0, limit);
    if (!ids.length) return [];

    const { data: rows } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, tom_tat, cover_id, tao_luc")
      .in("id", ids)
      .eq("trang_thai_noi_dung", "published");

    const attached = await attachNhomToBlogRows(
      (rows ?? [])
        .map((r) => mapRawBlog(r as Record<string, unknown>))
        .filter((x): x is RawBlog => x != null),
    );

    return attached.map((r) => ({
      id: r.id,
      slug: r.slug,
      tieu_de: r.tieu_de,
      tom_tat: r.tom_tat,
      cover_url: r.thumb_url ?? r.cover_url,
      tao_luc: r.tao_luc,
      eyebrow: r.bo_phan?.ten ?? "Bài viết",
    }));
  } catch {
    return [];
  }
}

const KHAM_PHA_LOAI: Record<string, string> = {
  mon_hoc_lien_quan: "mon_hoc",
  keyword_lien_quan: "keyword",
  phan_mem_lien_quan: "phan_mem",
  keyword: "keyword",
  mon_hoc: "mon_hoc",
  phan_mem: "phan_mem",
};

export async function fetchBlogExploreLinks(
  articleId: string,
): Promise<BlogExploreLink[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data: edges } = await supabase
      .from("article_lien_quan")
      .select("id_bai_viet_b, loai_quan_he")
      .eq("id_bai_viet_a", articleId);

    const pairs: { id: string; rel: string }[] = [];
    for (const e of edges ?? []) {
      const rel = String((e as { loai_quan_he?: string }).loai_quan_he ?? "").trim();
      const loai = KHAM_PHA_LOAI[rel];
      if (!loai) continue;
      const id = String((e as { id_bai_viet_b?: string }).id_bai_viet_b ?? "").trim();
      if (id) pairs.push({ id, rel });
    }
    if (!pairs.length) return [];

    const ids = [...new Set(pairs.map((p) => p.id))];
    const { data: rows } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de, loai_bai_viet")
      .in("id", ids)
      .eq("trang_thai_noi_dung", "published");

    const byId = new Map(
      (rows ?? []).map((r) => [
        String((r as { id?: string }).id),
        r as { slug?: string; tieu_de?: string; loai_bai_viet?: string },
      ]),
    );

    const out: BlogExploreLink[] = [];
    for (const p of pairs) {
      const row = byId.get(p.id);
      if (!row?.slug) continue;
      const loai = String(row.loai_bai_viet ?? KHAM_PHA_LOAI[p.rel] ?? "");
      if (!["mon_hoc", "keyword", "phan_mem"].includes(loai)) continue;
      out.push({
        id: p.id,
        slug: String(row.slug),
        tieu_de: String(row.tieu_de ?? "").trim() || "Không tiêu đề",
        loai_bai_viet: loai,
        loai_quan_he: p.rel,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchBlogNhomForArticle(article: {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_eng?: string | null;
  tom_tat?: string | null;
  cover_id?: string | null;
  thumbnail?: string | null;
  luot_xem?: number;
  tao_luc: string;
  cap_nhat_luc: string;
}): Promise<{
  article_nhom_all: ArticleNhomEmbedRow[] | null;
  bo_phan: ArticleNhomEmbedRow | null;
  cap_do: ArticleNhomEmbedRow | null;
}> {
  const raw = mapRawBlog({
    id: article.id,
    slug: article.slug,
    loai_bai_viet:
      "loai_bai_viet" in article
        ? String((article as { loai_bai_viet?: string }).loai_bai_viet ?? "blog")
        : "blog",
    tieu_de: article.tieu_de,
    tieu_de_eng: article.tieu_de_eng,
    tom_tat: article.tom_tat,
    cover_id: article.cover_id,
    thumbnail: article.thumbnail,
    luot_xem: article.luot_xem ?? 0,
    tao_luc: article.tao_luc,
    cap_nhat_luc: article.cap_nhat_luc,
  });
  if (!raw) {
    return { article_nhom_all: null, bo_phan: null, cap_do: null };
  }
  const [row] = await attachNhomToBlogRows([raw]);
  return {
    article_nhom_all: row?.article_nhom_all ?? null,
    bo_phan: row?.bo_phan ?? null,
    cap_do: row?.cap_do ?? null,
  };
}
