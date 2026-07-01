import "server-only";

import { resolveHubArticleThumbSync } from "@/lib/bai-viet/thumbnail";
import {
  fuzzyArticleSimilarity,
  fuzzyOrgPostSimilarity,
  fuzzyOrgSimilarity,
  fuzzyUserPostSimilarity,
  fuzzyUserSimilarity,
} from "@/lib/search/fuzzy-trigram";
import {
  articleHref,
  articleLoaiLabel,
  stripHtmlToPlainText,
} from "@/lib/search/helpers";
import { buildSupabaseOrIlike } from "@/lib/search/ilike-patterns";
import {
  buildOrgSearchItem,
  fetchOrgFootCounts,
  ORG_SEARCH_SELECT,
  type RawOrgSearchRow,
} from "@/lib/search/org-hit-meta";
import {
  buildOrgPostSearchItem,
  buildUserPostSearchItem,
  ORG_POST_SEARCH_SELECT,
  USER_POST_SEARCH_SELECT,
} from "@/lib/search/post-hit-meta";
import {
  buildUserSearchItem,
  fetchUserSearchStats,
  USER_SEARCH_SELECT,
  type RawUserSearchRow,
} from "@/lib/search/user-hit-meta";
import { rankSearchItems, type ScoredSearchItem } from "@/lib/search/ranking";
import type {
  GlobalSearchResult,
  SearchEntityKind,
  SearchHit,
  SearchKindTab,
} from "@/lib/search/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PER_KIND_LIMIT = 12;
const FETCH_POOL = 32;
const TRIGRAM_POOL = 20;

const ARTICLE_LOAI = [
  "nghe",
  "nganh_dao_tao",
  "mon_hoc",
  "keyword",
  "phan_mem",
  "blog",
] as const;

const PUBLIC_ORG_LOAI = [
  "truong_dai_hoc",
  "co_so_dao_tao",
  "studio",
  "doanh_nghiep",
  "cong_dong",
] as const;

const ARTICLE_SELECT =
  "id, slug, loai_bai_viet, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, meta_description, noi_dung_markdown, cover_id, thumbnail";

type ArticleRow = {
  id: string;
  slug: string;
  loai_bai_viet: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  meta_description: string | null;
  noi_dung_markdown: string | null;
  cover_id: string | null;
  thumbnail: string | null;
};

function emptyCounts(): Record<SearchEntityKind, number> {
  return {
    article: 0,
    org: 0,
    user: 0,
    user_post: 0,
    org_post: 0,
  };
}

function shouldSearchKind(
  tab: SearchKindTab,
  entity: SearchEntityKind,
): boolean {
  if (tab === "all") return true;
  if (tab === "article") return entity === "article";
  if (tab === "org") return entity === "org";
  if (tab === "user") return entity === "user";
  if (tab === "post") return entity === "user_post" || entity === "org_post";
  return true;
}

function mapArticleRow(row: ArticleRow, trigramSim = 0): ScoredSearchItem {
  const loai = String(row.loai_bai_viet ?? "").trim() || "blog";
  const slug = String(row.slug ?? "").trim();
  const tieuDeViet = row.tieu_de_viet ? String(row.tieu_de_viet).trim() : null;
  const tieuDe = String(row.tieu_de ?? "").trim();
  const tieuDeEng = row.tieu_de_eng ? String(row.tieu_de_eng).trim() : null;
  const tomTat = row.tom_tat ? String(row.tom_tat).trim() : null;
  const displayTitle = tieuDeViet || tieuDe || "Không tiêu đề";
  const contentPlain =
    stripHtmlToPlainText(row.noi_dung_markdown) ??
    (row.meta_description ? String(row.meta_description).trim() : null);

  return {
    trigramSim,
    fields: {
      titleVi: tieuDeViet,
      title: tieuDe || displayTitle,
      titleAlt: tieuDeEng,
      slug,
      summary: tomTat,
      content: contentPlain,
    },
    hit: {
      id: String(row.id),
      kind: "article",
      title: displayTitle,
      subtitle: tieuDeEng,
      snippet: tomTat,
      href: articleHref(loai, slug),
      avatarUrl: resolveHubArticleThumbSync({
        cover_id: row.cover_id,
        thumbnail: row.thumbnail,
      }),
      badge: articleLoaiLabel(loai),
      entityLoai: loai,
      slug,
    },
  };
}

async function searchArticles(q: string): Promise<SearchHit[]> {
  const supabase = createPublicSupabaseClient();
  const admin = createServiceRoleClient();

  const [ilikeRes, trigramMap] = await Promise.all([
    supabase
      .from("article_bai_viet")
      .select(ARTICLE_SELECT)
      .eq("trang_thai_noi_dung", "published")
      .in("loai_bai_viet", [...ARTICLE_LOAI])
      .or(
        buildSupabaseOrIlike(
          [
            "tieu_de_viet",
            "tieu_de",
            "tieu_de_eng",
            "slug",
            "tom_tat",
            "meta_description",
            "noi_dung_markdown",
          ],
          q,
        ),
      )
      .limit(FETCH_POOL),
    fuzzyArticleSimilarity(q, TRIGRAM_POOL),
  ]);

  const byId = new Map<string, ScoredSearchItem>();

  for (const row of (ilikeRes.data ?? []) as ArticleRow[]) {
    byId.set(String(row.id), mapArticleRow(row, trigramMap.get(String(row.id)) ?? 0));
  }

  const missingIds = [...trigramMap.keys()].filter((id) => !byId.has(id));
  if (missingIds.length > 0) {
    const { data: extraRows } = await admin
      .from("article_bai_viet")
      .select(ARTICLE_SELECT)
      .in("id", missingIds)
      .eq("trang_thai_noi_dung", "published")
      .in("loai_bai_viet", [...ARTICLE_LOAI]);

    for (const row of (extraRows ?? []) as ArticleRow[]) {
      const id = String(row.id);
      byId.set(id, mapArticleRow(row, trigramMap.get(id) ?? 0));
    }
  }

  return rankSearchItems(q, [...byId.values()], PER_KIND_LIMIT);
}

async function searchOrgs(q: string): Promise<SearchHit[]> {
  const admin = createServiceRoleClient();

  const [ilikeRes, trigramMap] = await Promise.all([
    admin
      .from("org_to_chuc")
      .select(ORG_SEARCH_SELECT)
      .in("loai_to_chuc", [...PUBLIC_ORG_LOAI])
      .or(buildSupabaseOrIlike(["ten", "slug", "mo_ta"], q))
      .limit(FETCH_POOL),
    fuzzyOrgSimilarity(q, TRIGRAM_POOL),
  ]);

  const rowsById = new Map<string, RawOrgSearchRow>();
  for (const row of ilikeRes.data ?? []) {
    rowsById.set(String(row.id), row as RawOrgSearchRow);
  }

  const missingIds = [...trigramMap.keys()].filter((id) => !rowsById.has(id));
  if (missingIds.length > 0) {
    const { data: extraRows } = await admin
      .from("org_to_chuc")
      .select(ORG_SEARCH_SELECT)
      .in("id", missingIds)
      .in("loai_to_chuc", [...PUBLIC_ORG_LOAI]);
    for (const row of extraRows ?? []) {
      rowsById.set(String(row.id), row as RawOrgSearchRow);
    }
  }

  const footCounts = await fetchOrgFootCounts(admin, [...rowsById.values()]);
  const items = [...rowsById.values()].map((row) =>
    buildOrgSearchItem(row, trigramMap.get(String(row.id)) ?? 0, footCounts),
  );

  return rankSearchItems(q, items, PER_KIND_LIMIT);
}

async function searchUsers(q: string): Promise<SearchHit[]> {
  const admin = createServiceRoleClient();

  const [ilikeRes, trigramMap] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select(USER_SEARCH_SELECT)
      .or(buildSupabaseOrIlike(["slug", "ten_hien_thi", "bio", "ai_summary_journey"], q))
      .limit(FETCH_POOL),
    fuzzyUserSimilarity(q, TRIGRAM_POOL),
  ]);

  const rowsById = new Map<string, RawUserSearchRow>();
  for (const row of ilikeRes.data ?? []) {
    rowsById.set(String(row.id), row as RawUserSearchRow);
  }

  const missingIds = [...trigramMap.keys()].filter((id) => !rowsById.has(id));
  if (missingIds.length > 0) {
    const { data: extraRows } = await admin
      .from("user_nguoi_dung")
      .select(USER_SEARCH_SELECT)
      .in("id", missingIds);
    for (const row of extraRows ?? []) {
      rowsById.set(String(row.id), row as RawUserSearchRow);
    }
  }

  const statsByUser = await fetchUserSearchStats(
    admin,
    [...rowsById.keys()],
  );
  const items = [...rowsById.values()].map((row) => {
    const stats = statsByUser.get(String(row.id)) ?? {
      cotMoc: 0,
      tacPham: 0,
      banBe: 0,
      toChucXacThuc: 0,
    };
    return buildUserSearchItem(
      row,
      trigramMap.get(String(row.id)) ?? 0,
      stats,
    );
  });

  return rankSearchItems(q, items, PER_KIND_LIMIT);
}

async function searchUserPosts(q: string): Promise<SearchHit[]> {
  const admin = createServiceRoleClient();

  const [ilikeRes, trigramMap] = await Promise.all([
    admin
      .from("content_tac_pham")
      .select(USER_POST_SEARCH_SELECT)
      .eq("che_do_hien_thi", "public")
      .or(buildSupabaseOrIlike(["tieu_de", "mo_ta", "noi_dung_html"], q))
      .limit(FETCH_POOL),
    fuzzyUserPostSimilarity(q, TRIGRAM_POOL),
  ]);

  const rowsById = new Map<string, Record<string, unknown>>();
  for (const row of ilikeRes.data ?? []) {
    rowsById.set(String(row.id), row as Record<string, unknown>);
  }

  const missingIds = [...trigramMap.keys()].filter((id) => !rowsById.has(id));
  if (missingIds.length > 0) {
    const { data: extraRows } = await admin
      .from("content_tac_pham")
      .select(USER_POST_SEARCH_SELECT)
      .in("id", missingIds)
      .eq("che_do_hien_thi", "public");
    for (const row of extraRows ?? []) {
      rowsById.set(String(row.id), row as Record<string, unknown>);
    }
  }

  const items = [...rowsById.values()]
    .map((row) =>
      buildUserPostSearchItem(row, trigramMap.get(String(row.id)) ?? 0),
    )
    .filter((item): item is ScoredSearchItem => item !== null);

  return rankSearchItems(q, items, PER_KIND_LIMIT);
}

async function searchOrgPosts(q: string): Promise<SearchHit[]> {
  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const [ilikeRes, trigramMap] = await Promise.all([
    admin
      .from("org_bai_dang")
      .select(ORG_POST_SEARCH_SELECT)
      .eq("trang_thai", "da_dang")
      .lte("tao_luc", nowIso)
      .or(buildSupabaseOrIlike(["tieu_de", "tom_tat", "noi_dung"], q))
      .limit(FETCH_POOL),
    fuzzyOrgPostSimilarity(q, TRIGRAM_POOL),
  ]);

  const rowsById = new Map<string, Record<string, unknown>>();
  for (const row of ilikeRes.data ?? []) {
    rowsById.set(String(row.id), row as Record<string, unknown>);
  }

  const missingIds = [...trigramMap.keys()].filter((id) => !rowsById.has(id));
  if (missingIds.length > 0) {
    const { data: extraRows } = await admin
      .from("org_bai_dang")
      .select(ORG_POST_SEARCH_SELECT)
      .in("id", missingIds)
      .eq("trang_thai", "da_dang")
      .lte("tao_luc", nowIso);
    for (const row of extraRows ?? []) {
      rowsById.set(String(row.id), row as Record<string, unknown>);
    }
  }

  const items = [...rowsById.values()]
    .map((row) =>
      buildOrgPostSearchItem(row, trigramMap.get(String(row.id)) ?? 0),
    )
    .filter((item): item is ScoredSearchItem => item !== null);

  return rankSearchItems(q, items, PER_KIND_LIMIT);
}

function mergeHits(groups: SearchHit[][]): SearchHit[] {
  return groups.flat();
}

export async function runGlobalSearch(options: {
  q?: string | null;
  kind?: string | null;
}): Promise<GlobalSearchResult> {
  const query = (options.q ?? "").trim();
  const kindRaw = (options.kind ?? "all").trim();
  const kind: SearchKindTab =
    kindRaw === "article" ||
    kindRaw === "org" ||
    kindRaw === "user" ||
    kindRaw === "post"
      ? kindRaw
      : "all";

  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      query,
      kind,
      hits: [],
      counts: emptyCounts(),
      message: "Supabase chưa cấu hình.",
    };
  }

  if (query.length < 1) {
    return {
      ok: true,
      query,
      kind,
      hits: [],
      counts: emptyCounts(),
    };
  }

  const tasks: Promise<SearchHit[]>[] = [];

  if (shouldSearchKind(kind, "article")) tasks.push(searchArticles(query));
  if (shouldSearchKind(kind, "org")) tasks.push(searchOrgs(query));
  if (shouldSearchKind(kind, "user")) tasks.push(searchUsers(query));
  if (shouldSearchKind(kind, "user_post")) tasks.push(searchUserPosts(query));
  if (shouldSearchKind(kind, "org_post")) tasks.push(searchOrgPosts(query));

  const groups = await Promise.all(tasks);
  const hits = mergeHits(groups);

  const counts = emptyCounts();
  for (const hit of hits) {
    counts[hit.kind] += 1;
  }

  return {
    ok: true,
    query,
    kind,
    hits,
    counts,
  };
}

export function groupHitsByKind(hits: SearchHit[]): SearchEntityKind[] {
  const order: SearchEntityKind[] = [
    "article",
    "org",
    "user",
    "user_post",
    "org_post",
  ];
  return order.filter((kind) => hits.some((h) => h.kind === kind));
}
