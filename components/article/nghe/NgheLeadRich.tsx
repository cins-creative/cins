import { KeywordInlineProse } from "@/components/article/keyword/KeywordInlineProse";
import { linkKeywordsInContent } from "@/lib/articles/link-keywords-in-content";

type Props = {
  /** HTML lead đã qua `buildArticleLeadSource` (hoặc HTML CMS tương đương). */
  html: string;
  /** Không gắn link tới keyword đang đọc (trang `/keyword/[slug]`). */
  excludeSlug?: string;
};

/** Nội dung khối lead — gắn link keyword + tooltip hover/touch. */
export async function NgheLeadRich({ html, excludeSlug }: Props) {
  const trimmed = html.trim();
  if (!trimmed) return null;

  const linked = await linkKeywordsInContent(trimmed, { excludeSlug });

  return (
    <div className="article-content-html">
      <KeywordInlineProse
        html={linked}
        className="nghe-lead-rich article-rich-content article-content-html"
      />
    </div>
  );
}

export { stripLeadingSqlComments } from "@/lib/article/rich-body";
