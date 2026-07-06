import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  fetchOgShareContext,
  type OgShareKind,
} from "@/lib/journey/og-share-fetch";

export type JourneyPageParams = Promise<{ slug: string }>;

export type JourneyPageSearchParams = Promise<{
  welcome?: string;
  view?: string;
  compose?: string;
  edit?: string;
}>;

export type JourneyMetadataSearchParams = Promise<{
  view?: string;
}>;

function ogKindFromSearch(view: string | undefined): OgShareKind {
  return view === "gallery" ? "gallery" : "journey";
}

export async function journeyPageGenerateMetadata({
  params,
  searchParams,
}: {
  params: JourneyPageParams;
  searchParams?: JourneyMetadataSearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const kind = ogKindFromSearch(sp.view);
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function JourneyPageRoute({
  params,
  searchParams,
}: {
  params: JourneyPageParams;
  searchParams: JourneyPageSearchParams;
}) {
  return (
    <CinsShell data-screen-label="Journey">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <JourneyProfilePageLoader params={params} searchParams={searchParams} />
      </Suspense>
    </CinsShell>
  );
}
