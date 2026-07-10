import "server-only";

import { normalizeTagName } from "@/lib/tag/normalize";
import { withTagPostgres } from "@/lib/tag/postgres";
import { TAG_SUGGEST_MAX } from "@/lib/tag/suggest-types";
import {
  PICKABLE_TAG_LOAI,
  parsePickableTagLoai,
  type PickableTagLoai,
} from "@/lib/tag/tag-loai";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type TagLoai = PickableTagLoai;

export type TagDedupMatch = {
  id: string;
  tieu_de: string;
  tieu_de_viet?: string | null;
  tieu_de_eng?: string | null;
  da_verify: boolean;
  loai_bai_viet: PickableTagLoai;
  /** `linh_vuc.ten` qua `article_bai_viet.id_linh_vuc` — chủ yếu bài `nghe`. */
  linh_vuc_ten?: string | null;
  so_nguoi_tagged?: number;
};

type LinhVucEmbed = { ten?: string | null } | { ten?: string | null }[] | null;

type TagRow = {
  id: string;
  tieu_de: string;
  tieu_de_viet?: string | null;
  tieu_de_eng?: string | null;
  da_verify: boolean | null;
  loai_bai_viet: PickableTagLoai | string | null;
  linh_vuc?: LinhVucEmbed;
  linh_vuc_ten?: string | null;
};

function parseLinhVucTen(raw: LinhVucEmbed): string | null {
  const node = Array.isArray(raw) ? raw[0] : raw;
  if (!node || typeof node !== "object") return null;
  const ten = String(node.ten ?? "").trim();
  return ten || null;
}

function toTagDedupMatch(row: TagRow): TagDedupMatch {
  return {
    id: row.id,
    tieu_de: row.tieu_de,
    tieu_de_viet:
      row.tieu_de_viet == null
        ? null
        : String(row.tieu_de_viet).trim() || null,
    tieu_de_eng:
      row.tieu_de_eng == null ? null : String(row.tieu_de_eng).trim() || null,
    da_verify: row.da_verify === true,
    loai_bai_viet: parsePickableTagLoai(row.loai_bai_viet),
    linh_vuc_ten: row.linh_vuc_ten ?? parseLinhVucTen(row.linh_vuc ?? null) ?? null,
  };
}

const SUGGEST_MENU_MAX = TAG_SUGGEST_MAX;
const SUGGEST_FETCH_MAX = 28;

function scoreTagTitles(
  normalized: string,
  row: Pick<TagRow, "tieu_de" | "tieu_de_viet" | "tieu_de_eng" | "da_verify">,
): number {
  const titles = [row.tieu_de, row.tieu_de_viet, row.tieu_de_eng]
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);
  let best = 0;
  for (const title of titles) {
    best = Math.max(best, scoreFallbackMatch(normalized, title));
  }
  return best + (row.da_verify === true ? 0.15 : 0);
}

/** Xen kẽ gợi ý theo loại — tránh keyword chiếm hết menu. */
function pickDiverseSuggestions(
  rows: TagDedupMatch[],
  scores: Map<string, number>,
  max = SUGGEST_MENU_MAX,
): TagDedupMatch[] {
  const byLoai = new Map<PickableTagLoai, TagDedupMatch[]>();
  const sorted = [...rows].sort(
    (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
  );
  for (const row of sorted) {
    const bucket = byLoai.get(row.loai_bai_viet) ?? [];
    bucket.push(row);
    byLoai.set(row.loai_bai_viet, bucket);
  }

  const out: TagDedupMatch[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (out.length < max) {
    let added = false;
    for (const loai of PICKABLE_TAG_LOAI) {
      const item = byLoai.get(loai)?.[round];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      added = true;
      if (out.length >= max) break;
    }
    if (!added) break;
    round++;
  }
  return out;
}

async function loadTagMatch(id: string): Promise<TagDedupMatch | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("article_bai_viet")
    .select(
      "id, tieu_de, tieu_de_viet, tieu_de_eng, da_verify, loai_bai_viet, linh_vuc:id_linh_vuc(ten)",
    )
    .eq("id", id)
    .in("loai_bai_viet", [...PICKABLE_TAG_LOAI])
    .eq("trang_thai_noi_dung", "published")
    .maybeSingle<TagRow>();
  if (!data?.id) return null;
  return toTagDedupMatch(data);
}

function scoreFallbackMatch(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase().trim();
  if (!c) return 0;
  if (c === q) return 1;
  if (c.startsWith(q)) return 0.85;
  if (q.startsWith(c)) return 0.8;
  if (c.includes(q)) return 0.65;
  if (q.includes(c)) return 0.55;
  return 0;
}

async function findExactAliasViaSupabase(
  normalized: string,
): Promise<{ id: string } | null> {
  const admin = createServiceRoleClient();

  const { data: aliasRow } = await admin
    .from("article_alias")
    .select("id_bai_viet")
    .eq("ten_alias", normalized)
    .maybeSingle<{ id_bai_viet: string }>();

  if (aliasRow?.id_bai_viet) {
    return { id: aliasRow.id_bai_viet };
  }

  const columns = ["tieu_de", "tieu_de_viet", "tieu_de_eng"] as const;
  for (const col of columns) {
    const { data } = await admin
      .from("article_bai_viet")
      .select("id")
      .in("loai_bai_viet", [...PICKABLE_TAG_LOAI])
      .eq("trang_thai_noi_dung", "published")
      .ilike(col, normalized)
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (data?.id) return { id: data.id };
  }

  return null;
}

async function findExactAliasViaPostgres(
  normalized: string,
): Promise<{ id: string } | null> {
  return withTagPostgres(async (sql) => {
    const aliasRows = await sql<{ id_bai_viet: string }[]>`
      SELECT id_bai_viet
      FROM article_alias
      WHERE lower(trim(ten_alias)) = ${normalized}
      LIMIT 1
    `;
    if (aliasRows[0]?.id_bai_viet) {
      return { id: aliasRows[0].id_bai_viet };
    }

    const tagRows = await sql<{ id: string }[]>`
      SELECT id
      FROM article_bai_viet
      WHERE loai_bai_viet IN ('keyword', 'phan_mem', 'mon_hoc', 'nganh_dao_tao', 'nghe')
        AND trang_thai_noi_dung = 'published'
        AND (
          lower(trim(tieu_de)) = ${normalized}
          OR lower(trim(coalesce(tieu_de_viet, ''))) = ${normalized}
          OR lower(trim(coalesce(tieu_de_eng, ''))) = ${normalized}
        )
      LIMIT 1
    `;
    return tagRows[0] ? { id: tagRows[0].id } : null;
  });
}

/** Dedup lớp 1 — exact lowercase (alias hoặc tieu_de*). */
export async function findExactAlias(
  ten: string,
): Promise<TagDedupMatch | null> {
  const normalized = normalizeTagName(ten);
  if (!normalized) return null;

  const viaPg = await findExactAliasViaPostgres(normalized);
  const id = viaPg?.id ?? (await findExactAliasViaSupabase(normalized))?.id;
  if (!id) return null;
  return loadTagMatch(id);
}

async function suggestFuzzyViaTrigram(
  normalized: string,
): Promise<TagDedupMatch[] | null> {
  return withTagPostgres(async (sql) => {
    try {
      const rows = await sql<
        {
          id: string;
          tieu_de: string;
          tieu_de_viet: string | null;
          tieu_de_eng: string | null;
          da_verify: boolean;
          loai_bai_viet: string;
          linh_vuc_ten: string | null;
          sim: number;
        }[]
      >`
        SELECT
          abv.id,
          abv.tieu_de,
          abv.tieu_de_viet,
          abv.tieu_de_eng,
          abv.da_verify,
          abv.loai_bai_viet,
          lv.ten AS linh_vuc_ten,
          GREATEST(
            similarity(lower(trim(abv.tieu_de)), ${normalized}),
            similarity(lower(trim(coalesce(abv.tieu_de_viet, ''))), ${normalized}),
            similarity(lower(trim(coalesce(abv.tieu_de_eng, ''))), ${normalized})
          ) AS sim
        FROM article_bai_viet abv
        LEFT JOIN linh_vuc lv ON lv.id = abv.id_linh_vuc
        WHERE abv.loai_bai_viet IN ('keyword', 'phan_mem', 'mon_hoc', 'nganh_dao_tao', 'nghe')
          AND abv.trang_thai_noi_dung = 'published'
          AND (
            similarity(lower(trim(abv.tieu_de)), ${normalized}) > 0.25
            OR similarity(lower(trim(coalesce(abv.tieu_de_viet, ''))), ${normalized}) > 0.25
            OR similarity(lower(trim(coalesce(abv.tieu_de_eng, ''))), ${normalized}) > 0.25
          )
        ORDER BY abv.da_verify DESC, sim DESC
        LIMIT ${SUGGEST_FETCH_MAX}
      `;
      const matches = rows.map((r) =>
        toTagDedupMatch({
          id: r.id,
          tieu_de: r.tieu_de,
          tieu_de_viet: r.tieu_de_viet,
          tieu_de_eng: r.tieu_de_eng,
          da_verify: r.da_verify,
          loai_bai_viet: r.loai_bai_viet,
          linh_vuc_ten: r.linh_vuc_ten,
        }),
      );
      const scores = new Map(matches.map((m, i) => [m.id, rows[i]?.sim ?? 0]));
      return pickDiverseSuggestions(matches, scores);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("similarity") ||
        msg.includes("pg_trgm") ||
        msg.includes("does not exist")
      ) {
        return null;
      }
      throw err;
    }
  });
}

async function suggestFuzzyViaIlike(
  normalized: string,
): Promise<TagDedupMatch[]> {
  const admin = createServiceRoleClient();
  const pattern = `%${normalized.replace(/[%_]/g, "")}%`;

  const { data } = await admin
    .from("article_bai_viet")
    .select(
      "id, tieu_de, tieu_de_viet, tieu_de_eng, da_verify, loai_bai_viet, linh_vuc:id_linh_vuc(ten)",
    )
    .in("loai_bai_viet", [...PICKABLE_TAG_LOAI])
    .eq("trang_thai_noi_dung", "published")
    .or(
      `tieu_de.ilike.${pattern},tieu_de_viet.ilike.${pattern},tieu_de_eng.ilike.${pattern}`,
    )
    .limit(SUGGEST_FETCH_MAX);

  const rows = (data ?? []) as TagRow[];
  const scored = rows
    .map((row) => {
      const score = scoreTagTitles(normalized, row);
      return {
        match: toTagDedupMatch(row),
        score,
      };
    })
    .filter((r) => r.score > 0);

  const scores = new Map(scored.map((r) => [r.match.id, r.score]));
  return pickDiverseSuggestions(
    scored.map((r) => r.match),
    scores,
  );
}

/**
 * Dedup lớp 2 — fuzzy suggest (trigram → ILIKE fallback).
 * KHÔNG tự map — chỉ gợi ý cho user confirm ở frontend.
 */
export async function suggestFuzzy(ten: string): Promise<TagDedupMatch[]> {
  const normalized = normalizeTagName(ten);
  if (!normalized || normalized.length < 2) return [];

  const trigram = await suggestFuzzyViaTrigram(normalized);
  if (trigram && trigram.length > 0) return trigram;

  return suggestFuzzyViaIlike(normalized);
}
