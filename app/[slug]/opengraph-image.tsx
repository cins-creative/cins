import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  OgFallbackShareCard,
  OgGalleryShareCard,
  OgJourneyShareCard,
} from "@/lib/journey/og-share-card";
import { loadOgFonts } from "@/lib/journey/og-fonts";
import { fetchOgShareContext } from "@/lib/journey/og-share-fetch";
import type {
  JourneyGalleryCardVariant,
  JourneyJourneyCardVariant,
} from "@/lib/journey/profile-share";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/** Alt tĩnh — OG alt động theo slug nằm trong generateMetadata. */
export const alt = "Hành trình sáng tạo trên CINs";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{
  view?: string;
  nhom?: string;
  filter?: string;
  v?: string;
}>;

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

/**
 * `opengraph-image` file convention của Next không luôn truyền `searchParams`
 * từ query trên URL ảnh. Đọc lại từ `x-url` / `next-url` nếu có (OpenNext/proxy).
 */
async function resolveOgSearch(
  sp: Awaited<SearchParams>,
): Promise<{ view?: string; nhom?: string; filter?: string }> {
  if (sp.view || sp.nhom || sp.filter) {
    return { view: sp.view, nhom: sp.nhom, filter: sp.filter };
  }
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const raw =
      h.get("x-url") ||
      h.get("x-forwarded-url") ||
      h.get("next-url") ||
      h.get("x-invoke-path");
    if (!raw) return {};
    const url = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw, "https://cins.vn");
    return {
      view: url.searchParams.get("view") ?? undefined,
      nhom: url.searchParams.get("nhom") ?? undefined,
      filter: url.searchParams.get("filter") ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function Image({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { slug } = await params;
  const sp = await resolveOgSearch(searchParams ? await searchParams : {});
  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;
  /** Phải là PNG RGBA — palette+alpha làm crash resvg/@vercel/og. */
  const logoWhiteUrl = `${origin}/assets/logo-cins-white.png`;

  const [ctx, fonts] = await Promise.all([
    fetchOgShareContext(slug, {
      view: sp.view,
      nhom: sp.nhom,
      filter: sp.filter,
    }),
    loadOgFonts(),
  ]);

  const element = ctx ? (
    ctx.kind === "gallery" ? (
      <OgGalleryShareCard
        profile={ctx.profile}
        logoUrl={logoUrl}
        theme={ctx.theme}
        layout={ctx.layout as JourneyGalleryCardVariant}
        filterLabel={
          ctx.filterSpec && ctx.filterSpec.kind !== "all"
            ? ctx.filterSpec.label
            : null
        }
      />
    ) : (
      <OgJourneyShareCard
        profile={ctx.profile}
        logoUrl={logoUrl}
        theme={ctx.theme}
        layout={ctx.layout as JourneyJourneyCardVariant}
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
