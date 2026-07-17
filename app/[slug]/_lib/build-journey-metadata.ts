import type { Metadata } from "next";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  fetchOgShareContext,
  type OgShareSearch,
} from "@/lib/journey/og-share-fetch";
import {
  buildJourneyOgImagePath,
  buildOgImageVersion,
  buildOgPageSearchParams,
} from "@/lib/journey/og-image-url";

function pagePathForShare(slug: string, search: OgShareSearch): string {
  const params = buildOgPageSearchParams(search);
  const qs = params.toString();
  const base = `/${encodeURIComponent(slug)}`;
  return qs ? `${base}?${qs}` : base;
}

/** Metadata journey/gallery (+ filter) — nhận giá trị đã resolve. */
export async function buildJourneyMetadata(
  slug: string,
  search: OgShareSearch | string | undefined = {},
): Promise<Metadata> {
  /* Tương thích call cũ: buildJourneyMetadata(slug, view?) */
  const resolved: OgShareSearch =
    typeof search === "string" || search === undefined
      ? { view: typeof search === "string" ? search : undefined }
      : search;

  const ctx = await fetchOgShareContext(slug, resolved);
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const pagePath = pagePathForShare(slug, resolved);

  const title = ctx
    ? `${ctx.displayTitle} · CINS`
    : `Journey · ${slug} · CINS`;
  const description =
    ctx?.description ?? `Hành trình sáng tạo của ${slug} trên CINS.`;

  const themeVersion = ctx
    ? buildOgImageVersion(ctx.theme, ctx.layout, ctx.filterVersion)
    : null;

  /** Ưu tiên PNG đã snapshot từ modal; fallback Satori `/opengraph-image`. */
  const ogImageUrl =
    ctx?.ogSnapshotUrl ??
    buildJourneyOgImagePath(slug, resolved, themeVersion);

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
      images: [
        {
          url: ogImageUrl,
          alt: title,
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: ogImageUrl, alt: title, width: 1200, height: 630 }],
    },
  };
}
