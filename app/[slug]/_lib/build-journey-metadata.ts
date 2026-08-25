import type { Metadata } from "next";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getT } from "@/lib/i18n/t";
import { getCinsLocale } from "@/lib/locale/server";
import { ogLocale } from "@/lib/locale/types";
import {
  buildJourneyOgImagePath,
  buildOgImageVersion,
  buildOgPageSearchParams,
} from "@/lib/journey/og-image-url";
import type { OgShareSearch } from "@/lib/journey/og-share-fetch";
import { ogKindFromSearch } from "@/lib/journey/og-share-fetch";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import {
  buildShareOgSnapshotKey,
  cfImagePublicUrl,
  parseShareOgThemeState,
  resolveShareOgSnapshotUrl,
} from "@/lib/journey/share-og-theme";

function pagePathForShare(slug: string, search: OgShareSearch): string {
  const params = buildOgPageSearchParams(search);
  const qs = params.toString();
  const base = `/${encodeURIComponent(slug)}`;
  return qs ? `${base}?${qs}` : base;
}

function truncateBio(text: string | null | undefined, max = 140): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Metadata document — chỉ hồ sơ + theme snapshot.
 * Không đếm gallery (đó là việc của `/opengraph-image` khi crawler lấy ảnh).
 */
export async function buildJourneyMetadata(
  slug: string,
  search: OgShareSearch | string | undefined = {},
): Promise<Metadata> {
  const resolved: OgShareSearch =
    typeof search === "string" || search === undefined
      ? { view: typeof search === "string" ? search : undefined }
      : search;

  const [{ owner }, locale] = await Promise.all([
    fetchOwnerBySlug(slug),
    getCinsLocale(),
  ]);
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const t = getT(locale);
  const pagePath = pagePathForShare(slug, resolved);

  const displayName = owner?.ten_hien_thi?.trim() || slug;
  const bio = owner ? truncateBio(owner.bio) : null;
  const kind = ogKindFromSearch(resolved.view);
  const title = owner
    ? kind === "gallery"
      ? `Portfolio · ${displayName} · CINS`
      : `${displayName} · CINS`
    : `Journey · ${slug} · CINS`;
  const description =
    bio ??
    (owner
      ? kind === "gallery"
        ? `${displayName} trên CINs.`
        : t("profile.journeyOf", { name: displayName })
      : t("profile.journeyOf", { name: slug }));

  let ogImageUrl = buildJourneyOgImagePath(slug, resolved, null);
  if (owner) {
    const themeState = parseShareOgThemeState(owner.theme, owner.slug);
    const layout =
      kind === "gallery" ? themeState.layouts.gallery : themeState.layouts.journey;
    const themeVersion = buildOgImageVersion(themeState.active, layout, null);
    const snapshotUrl =
      themeState.active.kind === "custom"
        ? cfImagePublicUrl(themeState.active.imageId)
        : resolveShareOgSnapshotUrl(
            themeState,
            buildShareOgSnapshotKey({
              kind,
              filterVersion: null,
              layout,
              theme: themeState.active,
            }),
          );
    ogImageUrl = snapshotUrl ?? buildJourneyOgImagePath(slug, resolved, themeVersion);
  }

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
      locale: ogLocale(locale),
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
