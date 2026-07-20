import type { Metadata } from "next";

import { seoSiteOrigin } from "@/lib/seo/site";

export type BuildPublicPageMetadataInput = {
  /** Path canonical bắt đầu bằng `/` (không query). */
  path: string;
  title: string;
  description?: string | null;
  /** Path hoặc absolute URL ảnh OG; mặc định không gắn images. */
  ogImagePath?: string | null;
  /** openGraph.type — mặc định `website` cho hub, `article` cho bài. */
  ogType?: "website" | "article" | "profile";
  /** `noindex,follow` cho trang filter/search. */
  noIndex?: boolean;
};

/**
 * Metadata chuẩn DEV_RULES §SEO: title, description, canonical, OG, Twitter.
 */
export function buildPublicPageMetadata(
  input: BuildPublicPageMetadataInput,
): Metadata {
  const siteOrigin = seoSiteOrigin();
  const metadataBase = new URL(siteOrigin);
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const title = input.title.trim() || "CINs";
  const description = input.description?.trim() || undefined;
  const ogType = input.ogType ?? "website";

  const images = input.ogImagePath
    ? [
        {
          url: input.ogImagePath,
          alt: title,
        },
      ]
    : undefined;

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical: path,
    },
    robots: input.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: ogType,
      siteName: "CINs",
      locale: "vi_VN",
      url: path,
      title,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images: [input.ogImagePath!] } : {}),
    },
  };
}
