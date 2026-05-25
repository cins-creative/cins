import { ArticleRichBody } from "@/components/article/ArticleRichBody";

export function ArticleContent({ markdown }: { markdown: string }) {
  return (
    <div className="article-content-html">
      <ArticleRichBody source={markdown} />
    </div>
  );
}
