import "server-only";

import { normalizeTagName } from "@/lib/tag/normalize";
import { withTagPostgres } from "@/lib/tag/postgres";
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
  da_verify: boolean;
  loai_bai_viet: PickableTagLoai;
};

type TagRow = {
  id: string;
  tieu_de: string;
  tieu_de_viet?: string | null;
  tieu_de_eng?: string | null;
  da_verify: boolean | null;
  loai_bai_viet: PickableTagLoai | string | null;
};

const SUGGEST_MENU_MAX = 12;
const SUGGEST_FETCH_MAX = 40;

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
    .select("id, tieu_de, da_verify, loai_bai_viet")
    .eq("id", id)
    .in("loai_bai_viet", [...PICKABLE_TAG_LOAI])
    .eq("trang_thai_noi_dung", "published")
    .maybeSingle<TagRow>();
  if (!data?.id) return null;
  return {
    id: data.id,
    tieu_de: data.tieu_de,
    da_verify: data.da_verify === true,
    loai_bai_viet: parsePickableTagLoai(data.loai_bai_viet),
  };
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
          da_verify: boolean;
          loai_bai_viet: string;
          sim: number;
        }[]
      >`
        SELECT
          id,
          tieu_de,
          da_verify,
          loai_bai_viet,
          GREATEST(
            similarity(lower(trim(tieu_de)), ${normalized}),
            similarity(lower(trim(coalesce(tieu_de_viet, ''))), ${normalized}),
            similarity(lower(trim(coalesce(tieu_de_eng, ''))), ${normalized})
          ) AS sim
        FROM article_bai_viet
        WHERE loai_bai_viet IN ('keyword', 'phan_mem', 'mon_hoc', 'nganh_dao_tao', 'nghe')
          AND trang_thai_noi_dung = 'published'
          AND (
            similarity(lower(trim(tieu_de)), ${normalized}) > 0.25
            OR similarity(lower(trim(coalesce(tieu_de_viet, ''))), ${normalized}) > 0.25
            OR similarity(lower(trim(coalesce(tieu_de_eng, ''))), ${normalized}) > 0.25
          )
        ORDER BY da_verify DESC, sim DESC
        LIMIT ${SUGGEST_FETCH_MAX}
      `;
      const matches = rows.map((r) => ({
        id: r.id,
        tieu_de: r.tieu_de,
        da_verify: r.da_verify === true,
        loai_bai_viet: parsePickableTagLoai(r.loai_bai_viet),
      }));
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
    .select("id, tieu_de, tieu_de_viet, tieu_de_eng, da_verify, loai_bai_viet")
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
        match: {
          id: row.id,
          tieu_de: row.tieu_de,
          da_verify: row.da_verify === true,
          loai_bai_viet: parsePickableTagLoai(row.loai_bai_viet),
        },
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

async function suggestFuzzyViaAi(
  ten: string,
  candidates: TagDedupMatch[],
): Promise<TagDedupMatch[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || candidates.length === 0) return [];

  const list = candidates
    .map((c, i) => `${i + 1}. [${c.id}] ${c.tieu_de}`)
    .join("\n");

  const prompt = `Người dùng muốn tag "${ten}" trong ngành sáng tạo Việt Nam.
Danh sách tag (keyword/phan_mem/môn học/ngành/nghề) đã có:
${list}

Chọn tối đa 5 tag trong danh sách có thể trùng nghĩa với tên người nhập (không phải tag mới).
Trả về JSON array các id UUID đã chọn, sort theo độ phù hợp giảm dần. Ví dụ: ["uuid1","uuid2"]
Nếu không có tag phù hợp, trả về [].`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TAG_MODEL?.trim() || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const ids = JSON.parse(match[0]) as string[];
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const out: TagDedupMatch[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (row) out.push(row);
      if (out.length >= 5) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function loadAiCandidatePool(
  normalized: string,
): Promise<TagDedupMatch[]> {
  const admin = createServiceRoleClient();
  const pattern = `%${normalized.slice(0, Math.min(8, normalized.length)).replace(/[%_]/g, "")}%`;

  const [verified, fuzzy] = await Promise.all([
    admin
      .from("article_bai_viet")
      .select("id, tieu_de, da_verify, loai_bai_viet")
      .in("loai_bai_viet", [...PICKABLE_TAG_LOAI])
      .eq("trang_thai_noi_dung", "published")
      .eq("da_verify", true)
      .order("cap_nhat_luc", { ascending: false })
      .limit(30),
    pattern.length >= 2
      ? admin
          .from("article_bai_viet")
          .select("id, tieu_de, da_verify, loai_bai_viet")
          .in("loai_bai_viet", [...PICKABLE_TAG_LOAI])
          .eq("trang_thai_noi_dung", "published")
          .or(
            `tieu_de.ilike.${pattern},tieu_de_viet.ilike.${pattern},tieu_de_eng.ilike.${pattern}`,
          )
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const seen = new Set<string>();
  const out: TagDedupMatch[] = [];
  for (const row of [...(verified.data ?? []), ...(fuzzy.data ?? [])]) {
    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const typed = row as TagRow;
    out.push({
      id,
      tieu_de: String(typed.tieu_de ?? ""),
      da_verify: typed.da_verify === true,
      loai_bai_viet: parsePickableTagLoai(typed.loai_bai_viet),
    });
    if (out.length >= 50) break;
  }
  return out;
}

/**
 * Dedup lớp 2 — fuzzy suggest (trigram → ILIKE fallback → AI nếu vẫn trống).
 * KHÔNG tự map — chỉ gợi ý cho user confirm ở frontend.
 */
export async function suggestFuzzy(ten: string): Promise<TagDedupMatch[]> {
  const normalized = normalizeTagName(ten);
  if (!normalized || normalized.length < 2) return [];

  const trigram = await suggestFuzzyViaTrigram(normalized);
  if (trigram && trigram.length > 0) return trigram;

  const ilike = await suggestFuzzyViaIlike(normalized);
  if (ilike.length > 0) return ilike;

  const pool = await loadAiCandidatePool(normalized);
  return suggestFuzzyViaAi(ten.trim(), pool);
}
