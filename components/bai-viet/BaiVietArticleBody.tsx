import { ArticleRichBody } from "@/components/article/ArticleRichBody";

type Props = {
  htmlOrMarkdown: string;
};

export function BaiVietArticleBody({ htmlOrMarkdown }: Props) {
  const raw = htmlOrMarkdown.trim();
  if (!raw) return null;

  return (
    <div className="bv-detail-prose-wrap">
      <ArticleRichBody source={raw} />
    </div>
  );
}
