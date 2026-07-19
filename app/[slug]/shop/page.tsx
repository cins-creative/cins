import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { buildJourneyMetadata } from "@/app/[slug]/_lib/build-journey-metadata";
import { CinsShell } from "@/components/cins/CinsShell";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await buildJourneyMetadata(slug, { view: "shop" });
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const path = `/${encodeURIComponent(slug)}/shop`;
  return {
    ...meta,
    robots: { index: true, follow: true },
    openGraph: {
      ...meta.openGraph,
      url: path,
    },
    alternates: {
      canonical: `${siteOrigin}${path}`,
    },
  };
}

export default async function UserShopPage({
  params,
}: {
  params: Params;
}) {
  return (
    <CinsShell data-screen-label="Shop">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <JourneyProfilePageLoader
          params={params}
          searchParams={Promise.resolve({ view: "shop" })}
          storefront
        />
      </Suspense>
    </CinsShell>
  );
}
