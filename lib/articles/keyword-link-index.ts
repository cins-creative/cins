import { unstable_cache } from "next/cache";

import { articlePublicHref } from "@/lib/articles/article-href";
import type { KeywordLinkEntry } from "@/lib/articles/keyword-link-types";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";

/** Tối thiểu 2 ký tự (VFX, 2D, …). */
const MIN_TIEU_DE_LEN = 2;

/** Các cụm lấy từ `tieu_de` (nguyên dòng + phần trước/sau ` | `, `-`, `:`). */
function phrasesFromTieuDe(tieuDe: string): string[] {
  const t = tieuDe.trim();
  if (!t) return [];

  const candidates: string[] = [t];
  const pipe = t.indexOf(" | ");
  if (pipe !== -1) {
    candidates.push(t.slice(0, pipe).trim(), t.slice(pipe + 3).trim());
  }
  for (const chunk of t.split(/\s*\|\s*|\s+[-–—]\s+|\s*:\s+/)) {
    const c = chunk.trim();
    if (c) candidates.push(c);
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const p = raw.trim();
    if (p.length < MIN_TIEU_DE_LEN) continue;
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.sort((a, b) => b.length - a.length);
}

async function fetchKeywordLinkIndexUncached(): Promise<KeywordLinkEntry[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, tom_tat, thumbnail, cover_id",
      )
      .eq("loai_bai_viet", "keyword")
      .eq("trang_thai_noi_dung", "published");
    if (error || !data?.length) return [];

    return data.map((row) => {
      const tieuDe = String(row.tieu_de ?? "").trim();
      const slug = String(row.slug);
      return {
        id: String(row.id),
        slug,
        href: articlePublicHref("keyword", slug),
        title: tieuDe || "Keyword",
        summary: (row.tom_tat as string | null)?.trim() || null,
        thumbUrl: null,
        thumbnail: (row.thumbnail as string | null) ?? null,
        cover_id: (row.cover_id as string | null) ?? null,
        phrases: phrasesFromTieuDe(tieuDe),
      };
    });
  } catch {
    return [];
  }
}

export const fetchKeywordLinkIndex = unstable_cache(
  fetchKeywordLinkIndexUncached,
  ["cins-keyword-link-index-v3"],
  { revalidate: 3600 },
);

export async function enrichKeywordEntriesWithThumbs(
  entries: KeywordLinkEntry[],
): Promise<KeywordLinkEntry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const { thumb_url } = await resolveHubArticleImages({
        thumbnail: entry.thumbnail ?? null,
        cover_id: entry.cover_id ?? null,
      });
      return { ...entry, thumbUrl: thumb_url ?? null };
    }),
  );
}
