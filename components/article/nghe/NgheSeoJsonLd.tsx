import type { ArticleBaiViet } from "@/lib/articles/types";
import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  occupationJsonLd,
} from "@/lib/seo/json-ld";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

/** Article + Occupation + BreadcrumbList cho trang nghề. */
export function NgheSeoJsonLd({
  article,
  slugPath,
}: {
  article: ArticleBaiViet;
  slugPath: string;
}) {
  const name =
    article.tieu_de_viet?.trim() || article.tieu_de.trim() || "Nghề nghiệp";
  const description =
    article.tom_tat?.trim() ||
    article.meta_description?.trim() ||
    undefined;
  const linhVuc = article.linh_vuc?.ten?.trim() || null;

  const data = [
    articleJsonLd({
      headline: article.tieu_de,
      description,
      urlPath: slugPath,
      datePublished: article.tao_luc,
      dateModified: article.cap_nhat_luc,
      imageUrl: `${slugPath}/opengraph-image`,
    }),
    occupationJsonLd({
      name,
      description,
      urlPath: slugPath,
      occupationalCategory: linhVuc,
    }),
    breadcrumbJsonLd([
      { name: "Khám phá nghề", path: NGHE_NGHIEP_HUB_PATH },
      { name, path: slugPath },
    ]),
  ];

  return <JsonLdScript data={data} />;
}
