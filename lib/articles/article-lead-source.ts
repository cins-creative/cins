import {
  markdownToArcLeadHtml,
  normalizeArticleRichHtml,
} from "@/lib/articles/article-rich-html-normalize";
import { normalizeArcSkillRichHtml } from "@/lib/articles/arc-skill-grid-normalize";
import { transformArcSkillEmojiSpans } from "@/lib/articles/arc-skill-emoji-to-ms";
import {
  injectRelatedJobsGridIntoHtml,
  type RelatedJobLienQuanRow,
} from "@/lib/articles/related-jobs-dynamic";
import { stripLeadingSqlComments } from "@/lib/article/rich-body";
import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";

/**
 * Chuẩn hoá HTML/markdown lead (ảnh CF public, arc-skill grid, emoji → ms).
 * Trang nghề truyền thêm `relatedJobsLienQuan` để inject lưới việc làm.
 */
export function buildArticleLeadSource(
  noi_dung: string | null | undefined,
  relatedJobsLienQuan: RelatedJobLienQuanRow[] = [],
): string | null {
  const base = (noi_dung ?? "").trim().replace(/\r\n/g, "\n");
  const stripped = stripLeadingSqlComments(base);
  if (!stripped) return null;
  const raw = /^\s*</.test(stripped)
    ? stripped
    : markdownToArcLeadHtml(stripped);
  const withPublic = imagedeliveryPreferPublicInHtml(raw);
  let html = normalizeArticleRichHtml(
    normalizeArcSkillRichHtml(transformArcSkillEmojiSpans(withPublic)),
  );
  if (relatedJobsLienQuan.length > 0) {
    html = injectRelatedJobsGridIntoHtml(html, relatedJobsLienQuan);
  }
  return html;
}
