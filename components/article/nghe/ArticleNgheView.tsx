import type { ArticleBaiViet } from "@/lib/articles/types";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { NgheLayoutStatic } from "@/components/article/nghe/static/NgheLayoutStatic";

export function ArticleNgheView({ article }: { article: ArticleBaiViet }) {
  const slugPath = `/bai-viet/${article.slug}`;

  return (
    <div className="article-page arv2 arv2-nghe">
      <ArticleJsonLd article={article} slugPath={slugPath} />
      <NgheLayoutStatic />
    </div>
  );
}
