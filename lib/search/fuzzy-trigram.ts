import "server-only";

import { normalizeSearchText } from "@/lib/search/normalize";
import { withTagPostgres } from "@/lib/tag/postgres";

const TRIGRAM_MIN = 0.2;
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

async function trigramIdMap(
  run: () => Promise<Array<{ id: string; sim: number }>>,
): Promise<Map<string, number>> {
  try {
    const rows = await run();
    const map = new Map<string, number>();
    for (const row of rows) {
      const id = String(row.id ?? "").trim();
      if (!id) continue;
      const sim = typeof row.sim === "number" ? row.sim : 0;
      map.set(id, Math.max(map.get(id) ?? 0, sim));
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function fuzzyArticleSimilarity(
  query: string,
  limit: number,
): Promise<Map<string, number>> {
  const q = normalizeSearchText(query);
  if (q.length < 2) return new Map();

  const result = await withTagPostgres(async (sql) =>
    trigramIdMap(async () =>
      sql<{ id: string; sim: number }[]>`
        SELECT
          id,
          GREATEST(
            similarity(lower(trim(tieu_de)), ${q}),
            similarity(lower(trim(coalesce(tieu_de_viet, ''))), ${q}),
            similarity(lower(trim(coalesce(tieu_de_eng, ''))), ${q}),
            similarity(lower(trim(coalesce(tom_tat, ''))), ${q}),
            similarity(lower(trim(slug)), ${q.replace(/\s+/g, "-")})
          ) AS sim
        FROM article_bai_viet
        WHERE trang_thai_noi_dung = 'published'
          AND loai_bai_viet = ANY(${[...ARTICLE_LOAI]})
          AND (
            similarity(lower(trim(tieu_de)), ${q}) > ${TRIGRAM_MIN}
            OR similarity(lower(trim(coalesce(tieu_de_viet, ''))), ${q}) > ${TRIGRAM_MIN}
            OR similarity(lower(trim(coalesce(tieu_de_eng, ''))), ${q}) > ${TRIGRAM_MIN}
            OR similarity(lower(trim(coalesce(tom_tat, ''))), ${q}) > ${TRIGRAM_MIN}
            OR similarity(lower(trim(slug)), ${q.replace(/\s+/g, "-")}) > ${TRIGRAM_MIN}
          )
        ORDER BY sim DESC
        LIMIT ${limit}
      `,
    ),
  );

  return result ?? new Map();
}

export async function fuzzyOrgSimilarity(
  query: string,
  limit: number,
): Promise<Map<string, number>> {
  const q = normalizeSearchText(query);
  if (q.length < 2) return new Map();

  const result = await withTagPostgres(async (sql) =>
    trigramIdMap(async () =>
      sql<{ id: string; sim: number }[]>`
        SELECT
          id,
          GREATEST(
            similarity(lower(trim(ten)), ${q}),
            similarity(lower(trim(slug)), ${q.replace(/\s+/g, "-")})
          ) AS sim
        FROM org_to_chuc
        WHERE loai_to_chuc = ANY(${[...PUBLIC_ORG_LOAI]})
          AND (
            similarity(lower(trim(ten)), ${q}) > ${TRIGRAM_MIN}
            OR similarity(lower(trim(slug)), ${q.replace(/\s+/g, "-")}) > ${TRIGRAM_MIN}
          )
        ORDER BY sim DESC
        LIMIT ${limit}
      `,
    ),
  );

  return result ?? new Map();
}

export async function fuzzyUserSimilarity(
  query: string,
  limit: number,
): Promise<Map<string, number>> {
  const q = normalizeSearchText(query.replace(/^@/, ""));
  if (q.length < 2) return new Map();

  const result = await withTagPostgres(async (sql) =>
    trigramIdMap(async () =>
      sql<{ id: string; sim: number }[]>`
        SELECT
          id,
          GREATEST(
            similarity(lower(trim(coalesce(ten_hien_thi, ''))), ${q}),
            similarity(lower(trim(slug)), ${q.replace(/\s+/g, "-")})
          ) AS sim
        FROM user_nguoi_dung
        WHERE
          similarity(lower(trim(coalesce(ten_hien_thi, ''))), ${q}) > ${TRIGRAM_MIN}
          OR similarity(lower(trim(slug)), ${q.replace(/\s+/g, "-")}) > ${TRIGRAM_MIN}
        ORDER BY sim DESC
        LIMIT ${limit}
      `,
    ),
  );

  return result ?? new Map();
}

export async function fuzzyUserPostSimilarity(
  query: string,
  limit: number,
): Promise<Map<string, number>> {
  const q = normalizeSearchText(query);
  if (q.length < 2) return new Map();

  const result = await withTagPostgres(async (sql) =>
    trigramIdMap(async () =>
      sql<{ id: string; sim: number }[]>`
        SELECT
          id,
          GREATEST(
            similarity(lower(trim(tieu_de)), ${q}),
            similarity(lower(trim(coalesce(mo_ta, ''))), ${q})
          ) AS sim
        FROM content_tac_pham
        WHERE che_do_hien_thi = 'public'
          AND (
            similarity(lower(trim(tieu_de)), ${q}) > ${TRIGRAM_MIN}
            OR similarity(lower(trim(coalesce(mo_ta, ''))), ${q}) > ${TRIGRAM_MIN}
          )
        ORDER BY sim DESC
        LIMIT ${limit}
      `,
    ),
  );

  return result ?? new Map();
}

export async function fuzzyOrgPostSimilarity(
  query: string,
  limit: number,
): Promise<Map<string, number>> {
  const q = normalizeSearchText(query);
  if (q.length < 2) return new Map();

  const nowIso = new Date().toISOString();

  const result = await withTagPostgres(async (sql) =>
    trigramIdMap(async () =>
      sql<{ id: string; sim: number }[]>`
        SELECT
          id,
          GREATEST(
            similarity(lower(trim(tieu_de)), ${q}),
            similarity(lower(trim(coalesce(tom_tat, ''))), ${q})
          ) AS sim
        FROM org_bai_dang
        WHERE trang_thai = 'da_dang'
          AND tao_luc <= ${nowIso}::timestamptz
          AND (
            similarity(lower(trim(tieu_de)), ${q}) > ${TRIGRAM_MIN}
            OR similarity(lower(trim(coalesce(tom_tat, ''))), ${q}) > ${TRIGRAM_MIN}
          )
        ORDER BY sim DESC
        LIMIT ${limit}
      `,
    ),
  );

  return result ?? new Map();
}
