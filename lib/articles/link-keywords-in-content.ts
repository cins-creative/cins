import {
  enrichKeywordEntriesWithThumbs,
  fetchKeywordLinkIndex,
} from "@/lib/articles/keyword-link-index";
import type { LinkKeywordsOptions } from "@/lib/articles/keyword-link-types";
import {
  collectLinkedSlugs,
  injectKeywordThumbsInHtml,
  linkKeywordsInHtml,
} from "@/lib/articles/link-keywords-in-html";

/**
 * Gắn keyword inline: toàn bộ index (~750), khớp theo `tieu_de` (không phân biệt hoa thường).
 * Không lọc trước theo plain text; không giới hạn số lần gắn (trừ excludeSlug).
 */
export async function linkKeywordsInContent(
  html: string,
  options: LinkKeywordsOptions = {},
): Promise<string> {
  const trimmed = html.trim();
  if (!trimmed) return html;

  const index = await fetchKeywordLinkIndex();
  if (!index.length) return trimmed;

  const linked = linkKeywordsInHtml(trimmed, index, {
    maxPerSlug: 0,
    ...options,
  });

  const slugs = collectLinkedSlugs(linked);
  if (!slugs.size) return linked;

  const bySlug = new Map(index.map((e) => [e.slug, e]));
  const used = [...slugs]
    .map((s) => bySlug.get(s))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const withThumbs = await enrichKeywordEntriesWithThumbs(used);
  const thumbMap = new Map(withThumbs.map((e) => [e.slug, e]));

  return injectKeywordThumbsInHtml(linked, thumbMap);
}
