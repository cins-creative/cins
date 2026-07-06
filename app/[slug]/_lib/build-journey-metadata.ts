import type { Metadata } from "next";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  fetchOgShareContext,
  type OgShareKind,
} from "@/lib/journey/og-share-fetch";

function ogKindFromSearch(view: string | undefined): OgShareKind {
  return view === "gallery" ? "gallery" : "journey";
}

/** Metadata journey/gallery — nhận giá trị đã resolve, không nhận Promise params. */
export async function buildJourneyMetadata(
  slug: string,
  view?: string,
): Promise<Metadata> {
  const kind = ogKindFromSearch(view);
  const ctx = await fetchOgShareContext(slug, kind);
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const pagePath =
    kind === "gallery"
      ? `/${encodeURIComponent(slug)}?view=gallery`
      : `/${encodeURIComponent(slug)}`;

  const title = ctx
    ? `${ctx.displayTitle} · CINS`
    : `Journey · ${slug} · CINS`;
  const description =
    ctx?.description ?? `Hành trình sáng tạo của ${slug} trên CINS.`;

  return {
    metadataBase: new URL(siteOrigin),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: pagePath,
      siteName: "CINs",
      locale: "vi_VN",
      type: "profile",
      images: [{ alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
