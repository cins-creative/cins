import type { ArticleBaiViet } from "@/lib/articles/types";
import {
  articleJsonLd,
  learningResourceJsonLd,
} from "@/lib/seo/json-ld";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

export function ArticleJsonLd({
  article,
  slugPath,
  variant = "article",
}: {
  article: ArticleBaiViet;
  slugPath: string;
  /** `learningResource` cho môn học. */
  variant?: "article" | "learningResource";
}) {
  const headline =
    article.tieu_de_viet?.trim() || article.tieu_de.trim() || "CINs";
  const description =
    article.tom_tat ?? article.meta_description ?? undefined;

  const data =
    variant === "learningResource"
      ? learningResourceJsonLd({
          name: headline,
          description,
          urlPath: slugPath,
          datePublished: article.tao_luc,
          dateModified: article.cap_nhat_luc,
        })
      : articleJsonLd({
          headline: article.tieu_de,
          description,
          urlPath: slugPath,
          datePublished: article.tao_luc,
          dateModified: article.cap_nhat_luc,
        });

  return <JsonLdScript data={data} />;
}
