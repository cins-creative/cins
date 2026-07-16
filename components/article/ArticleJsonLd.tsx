import type { ArticleBaiViet } from "@/lib/articles/types";

function siteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "https://cins.vn";
}

export function ArticleJsonLd({
  article,
  slugPath,
}: {
  article: ArticleBaiViet;
  slugPath: string;
}) {
  const base = siteOrigin();
  if (!base) return null;

  const url = `${base}${slugPath}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.tieu_de,
    description: article.tom_tat ?? article.meta_description ?? undefined,
    dateModified: article.cap_nhat_luc,
    datePublished: article.tao_luc,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    author: { "@type": "Organization", name: "CINs" },
    publisher: { "@type": "Organization", name: "CINs" },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
