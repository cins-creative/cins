import { ArticleMarkdownBody } from "@/components/article/ArticleMarkdownBody";

export function ArticleContent({ markdown }: { markdown: string }) {
  return <ArticleMarkdownBody markdown={markdown} className="body" />;
}
