import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import type { RelatedJobLienQuanRow } from "@/lib/articles/related-jobs-dynamic";

/** Cùng pipeline với `ArticleNgheView` — preview lead từ `noi_dung` đang soạn. */
export function buildNgheLeadSourceFromNoiDung(
  noi_dung: string | null | undefined,
  relatedJobsLienQuan: RelatedJobLienQuanRow[],
): string | null {
  return buildArticleLeadSource(noi_dung, relatedJobsLienQuan);
}
