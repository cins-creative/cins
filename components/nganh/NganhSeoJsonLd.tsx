import type { NganhDetailArticle } from "@/lib/nganh/types";
import { articlePublicHref } from "@/lib/articles/article-href";
import { NGANH_HOC_HUB_PATH } from "@/lib/cins/hubPaths";
import {
  articleJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo/json-ld";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

export function NganhSeoJsonLd({ article }: { article: NganhDetailArticle }) {
  const slugPath = articlePublicHref("nganh_dao_tao", article.slug);
  const name =
    article.tieu_de_viet?.trim() || article.tieu_de.trim() || "Ngành đào tạo";
  const description = article.tom_tat?.trim() || undefined;

  const data = [
    articleJsonLd({
      headline: article.tieu_de,
      description,
      urlPath: slugPath,
      dateModified: article.cap_nhat_luc,
      imageUrl: `${slugPath}/opengraph-image`,
    }),
    breadcrumbJsonLd([
      { name: "Ngành học", path: NGANH_HOC_HUB_PATH },
      { name, path: slugPath },
    ]),
  ];

  return <JsonLdScript data={data} />;
}
