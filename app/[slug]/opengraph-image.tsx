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
/** Alt tĩnh — OG alt động theo slug nằm trong generateMetadata. */
export const alt = "Hành trình sáng tạo trên CINs";

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
      <OgGalleryShareCard
        profile={ctx.profile}
        logoUrl={logoUrl}
        theme={ctx.theme}
      />
    ) : (
      <OgJourneyShareCard
        profile={ctx.profile}
        logoUrl={logoUrl}
        theme={ctx.theme}
      />
    )
  ) : (
    <OgFallbackShareCard slug={slug} logoUrl={logoWhiteUrl} />
  );

  return new ImageResponse(element, {
    ...size,
    fonts,
  });
}
