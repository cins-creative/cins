import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  OgFallbackShareCard,
  OgGalleryShareCard,
  OgJourneyShareCard,
} from "@/lib/journey/og-share-card";
import { loadOgFonts } from "@/lib/journey/og-fonts";
import {
  fetchOgShareContext,
  type OgShareKind,
} from "@/lib/journey/og-share-fetch";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ view?: string }>;

function shareKindFromSearch(view: string | undefined): OgShareKind {
  return view === "gallery" ? "gallery" : "journey";
}

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

export default async function Image({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const kind = shareKindFromSearch(sp.view);
  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;
  const logoWhiteUrl = `${origin}/assets/logo-cins-white.png`;

  const [ctx, fonts] = await Promise.all([
    fetchOgShareContext(slug, kind),
    loadOgFonts(),
  ]);

  const element = ctx ? (
    kind === "gallery" ? (
      <OgGalleryShareCard profile={ctx.profile} logoUrl={logoUrl} />
    ) : (
      <OgJourneyShareCard profile={ctx.profile} logoUrl={logoUrl} />
    )
  ) : (
    <OgFallbackShareCard slug={slug} logoUrl={logoWhiteUrl} />
  );

  return new ImageResponse(element, {
    ...size,
    fonts,
  });
}

export async function alt({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}): Promise<string> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const kind = shareKindFromSearch(sp.view);
  const ctx = await fetchOgShareContext(slug, kind);
  if (!ctx) {
    return `Journey · ${slug} · CINs`;
  }
  return `${ctx.displayTitle} · CINs`;
}
