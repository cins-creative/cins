import { normalizeArcSkillRichHtml } from "@/lib/articles/arc-skill-grid-normalize";
import { transformArcSkillEmojiSpans } from "@/lib/articles/arc-skill-emoji-to-ms";
import {
  injectRelatedJobsGridIntoHtml,
  type RelatedJobLienQuanRow,
} from "@/lib/articles/related-jobs-dynamic";
import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";
import { stripLeadingSqlComments } from "@/components/article/nghe/NgheLeadRich";

/** Cùng pipeline với `ArticleNgheView` — preview lead từ `noi_dung` đang soạn. */
export function buildNgheLeadSourceFromNoiDung(
  noi_dung: string | null | undefined,
  relatedJobsLienQuan: RelatedJobLienQuanRow[],
): string | null {
  const base = (noi_dung ?? "").trim().replace(/\r\n/g, "\n");
  const stripped = stripLeadingSqlComments(base);
  if (!stripped) return null;
  if (/^\s*</.test(stripped)) {
    const withPublic = imagedeliveryPreferPublicInHtml(stripped);
    return injectRelatedJobsGridIntoHtml(
      normalizeArcSkillRichHtml(transformArcSkillEmojiSpans(withPublic)),
      relatedJobsLienQuan,
    );
  }
  return stripped;
}
