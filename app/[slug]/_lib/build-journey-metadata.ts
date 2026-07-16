import type { Metadata } from "next";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  buildOgShareSearchParams,
  fetchOgShareContext,
  type OgShareSearch,
} from "@/lib/journey/og-share-fetch";
import type { ShareOgTheme } from "@/lib/journey/share-og-theme";

/**
 * Token phiên bản OG suy ra từ theme + layout + filter.
 * Đổi bất kỳ cái nào → URL ảnh OG đổi, buộc Facebook/Zalo/… refetch.
 */
function ogThemeVersion(
  theme: ShareOgTheme | null | undefined,
  layout: string | null | undefined,
  filterVersion: string | null | undefined,
): string | null {
  const parts: string[] = [];
  if (layout) parts.push(`l${layout}`);
  if (filterVersion) parts.push(filterVersion);
  if (theme) {
    if (theme.kind === "custom") {
      parts.push(`c${theme.imageId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`);
    } else {
      parts.push(`p${theme.id}`);
    }
  }
  return parts.length > 0 ? parts.join("-") : null;
}

function pagePathForShare(slug: string, search: OgShareSearch): string {
  const params = buildOgShareSearchParams(search);
  const qs = params.toString();
  const base = `/${encodeURIComponent(slug)}`;
  return qs ? `${base}?${qs}` : base;
}

function ogImagePathForShare(
  slug: string,
  search: OgShareSearch,
  version: string | null,
): string {
  const params = buildOgShareSearchParams(search);
  if (version) params.set("v", version);
  const qs = params.toString();
  const base = `/${encodeURIComponent(slug)}/opengraph-image`;
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
    ? ogThemeVersion(ctx.theme, ctx.layout, ctx.filterVersion)
    : null;

  /** Ưu tiên PNG đã snapshot từ modal; fallback Satori `/opengraph-image`. */
  const ogImageUrl =
    ctx?.ogSnapshotUrl ??
    ogImagePathForShare(slug, resolved, themeVersion);

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
