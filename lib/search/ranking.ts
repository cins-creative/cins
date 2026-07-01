import { normalizeSearchText } from "@/lib/search/normalize";
import type { SearchHit } from "@/lib/search/types";

/** Các tầng ưu tiên: tên/tiêu đề → mô tả ngắn → nội dung. */
export type SearchRankFields = {
  /** Tên/tiêu đề tiếng Việt (nếu có) — cao nhất trong tier title. */
  titleVi?: string | null;
  /** Tên/tiêu đề chính. */
  title: string;
  /** Tên phụ (EN, alias…). */
  titleAlt?: string | null;
  slug?: string | null;
  /** Mô tả ngắn — tom_tat, mo_ta, bio, tagline org. */
  summary?: string | null;
  /** Nội dung dài — body/markdown/html (plain). */
  content?: string | null;
};

export type ScoredSearchItem = {
  hit: SearchHit;
  fields: SearchRankFields;
  /** pg_trgm similarity 0–1 — fallback dưới title/summary, trên content mờ. */
  trigramSim?: number;
};

/** Trần điểm theo tầng — đảm bảo title luôn thắng summary, summary thắng content. */
const TIER_CEILING = {
  titleVi: 1000,
  title: 980,
  titleAlt: 960,
  slug: 940,
  summary: 560,
  content: 280,
} as const;

/** Khớp ký tự theo thứ tự — "tu" khớp "truc" (Trúc) sau khi bỏ dấu. */
function isCharSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return true;
  let j = 0;
  for (let i = 0; i < haystack.length && j < needle.length; i++) {
    if (haystack[i] === needle[j]) j++;
  }
  return j === needle.length;
}

function scoreTextInTier(
  q: string,
  raw: string | null | undefined,
  ceiling: number,
): number {
  const text = normalizeSearchText(raw ?? "");
  if (!text) return 0;

  if (text === q) return ceiling;
  if (text.startsWith(q)) return ceiling - 35;

  const qTokens = q.split(" ").filter(Boolean);
  if (qTokens.length > 0 && qTokens.every((t) => text.includes(t))) {
    return ceiling - 70;
  }

  if (qTokens.length === 1 && text.split(" ").includes(qTokens[0]!)) {
    return ceiling - 90;
  }

  if (text.includes(q)) return ceiling - 110;

  if (q.length >= 2 && isCharSubsequence(q, text)) {
    return ceiling - 125;
  }

  if (qTokens.length > 0) {
    const matched = qTokens.filter((t) => text.includes(t));
    if (matched.length > 0) {
      const ratio = matched.length / qTokens.length;
      return Math.floor(ceiling - 150 + ratio * 80);
    }
  }

  return 0;
}

function scoreSlug(query: string, slugRaw: string | null | undefined): number {
  const slug = slugRaw?.trim() ?? "";
  if (!slug) return 0;

  const q = normalizeSearchText(query.replace(/^@/, ""));
  const slugSpaced = normalizeSearchText(slug.replace(/-/g, " "));
  const slugCompact = normalizeSearchText(slug.replace(/-/g, ""));

  return Math.max(
    scoreTextInTier(q, slugCompact, TIER_CEILING.slug),
    scoreTextInTier(q, slugSpaced, TIER_CEILING.slug - 10),
    scoreTextInTier(q, slug, TIER_CEILING.slug - 15),
  );
}

/**
 * Điểm cao hơn = khớp chính xác hơn & đúng tầng ưu tiên hơn.
 * Thứ tự: tên/tiêu đề (VN nếu có) → mô tả ngắn → nội dung.
 */
export function scoreSearchMatch(
  query: string,
  fields: SearchRankFields,
  trigramSim = 0,
): number {
  const q = normalizeSearchText(query.replace(/^@/, ""));
  if (!q) return 0;

  const titleScores = [
    scoreTextInTier(q, fields.titleVi, TIER_CEILING.titleVi),
    scoreTextInTier(q, fields.title, TIER_CEILING.title),
    scoreTextInTier(q, fields.titleAlt, TIER_CEILING.titleAlt),
    scoreSlug(q, fields.slug),
  ];

  const summaryScore = scoreTextInTier(q, fields.summary, TIER_CEILING.summary);
  const contentScore = scoreTextInTier(q, fields.content, TIER_CEILING.content);

  let best = Math.max(...titleScores, summaryScore, contentScore, 0);

  if (trigramSim > 0) {
    // Gần giống — dưới khớp title/summary rõ, trên khớp content yếu.
    best = Math.max(best, 200 + trigramSim * 180);
  }

  return best;
}

export function rankSearchItems(
  query: string,
  items: ScoredSearchItem[],
  limit: number,
): SearchHit[] {
  const scored = items
    .map((item) => ({
      hit: item.hit,
      score: scoreSearchMatch(query, item.fields, item.trigramSim ?? 0),
    }))
    .filter((x) => x.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.hit.title.localeCompare(b.hit.title, "vi");
  });

  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const { hit } of scored) {
    const key = `${hit.kind}:${hit.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}
