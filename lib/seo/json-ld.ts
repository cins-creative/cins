import { seoAbsoluteUrl, seoSiteOrigin } from "@/lib/seo/site";

export type JsonLdObject = Record<string, unknown>;

export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data);
}

export function articleJsonLd(input: {
  headline: string;
  description?: string | null;
  urlPath: string;
  datePublished?: string | null;
  dateModified?: string | null;
  imageUrl?: string | null;
}): JsonLdObject {
  const url = seoAbsoluteUrl(input.urlPath);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description?.trim() || undefined,
    datePublished: input.datePublished || undefined,
    dateModified: input.dateModified || undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(input.imageUrl
      ? { image: [seoAbsoluteUrl(input.imageUrl)] }
      : {}),
    author: { "@type": "Organization", name: "CINs" },
    publisher: {
      "@type": "Organization",
      name: "CINs",
      url: seoSiteOrigin(),
    },
  };
}

export function occupationJsonLd(input: {
  name: string;
  description?: string | null;
  urlPath: string;
  occupationalCategory?: string | null;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Occupation",
    name: input.name,
    description: input.description?.trim() || undefined,
    url: seoAbsoluteUrl(input.urlPath),
    ...(input.occupationalCategory?.trim()
      ? { occupationalCategory: input.occupationalCategory.trim() }
      : {}),
  };
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: seoAbsoluteUrl(item.path),
    })),
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description?: string | null;
  urlPath: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description?.trim() || undefined,
    url: seoAbsoluteUrl(input.urlPath),
    isPartOf: {
      "@type": "WebSite",
      name: "CINs",
      url: seoSiteOrigin(),
    },
  };
}

/** LearningResource — môn học / tài nguyên học. */
export function learningResourceJsonLd(input: {
  name: string;
  description?: string | null;
  urlPath: string;
  datePublished?: string | null;
  dateModified?: string | null;
}): JsonLdObject {
  const url = seoAbsoluteUrl(input.urlPath);
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: input.name,
    description: input.description?.trim() || undefined,
    url,
    datePublished: input.datePublished || undefined,
    dateModified: input.dateModified || undefined,
    provider: { "@type": "Organization", name: "CINs", url: seoSiteOrigin() },
  };
}
