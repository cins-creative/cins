import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { buildJourneyMetadata } from "@/app/[slug]/_lib/build-journey-metadata";
import { CinsShell } from "@/components/cins/CinsShell";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";
import { SHOP_SLUG_RESERVED } from "@/lib/shop/cua-hang-href";

type Params = Promise<{ slug: string; shopSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, shopSlug } = await params;
  const resolved = await resolveShopSlugForOwnerSlug(slug);
  const meta = await buildJourneyMetadata(slug, { view: "shop" });
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const path = resolved?.href ?? `/${encodeURIComponent(slug)}/shop/${encodeURIComponent(shopSlug)}`;
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

export default async function UserShopStorefrontPage({
  params,
}: {
  params: Params;
}) {
  const { slug, shopSlug: rawShopSlug } = await params;
  let shopSlug = rawShopSlug;
  try {
    shopSlug = decodeURIComponent(rawShopSlug);
  } catch {
    /* keep raw */
  }

  if (SHOP_SLUG_RESERVED.has(shopSlug.trim().toLowerCase())) {
    notFound();
  }

  const resolved = await resolveShopSlugForOwnerSlug(slug);
  if (!resolved) notFound();

  if (shopSlug !== resolved.shopSlug) {
    redirect(resolved.href);
  }

  return (
    <CinsShell data-screen-label="Shop">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <JourneyProfilePageLoader
          params={Promise.resolve({ slug })}
          searchParams={Promise.resolve({ view: "shop" })}
          storefront
        />
      </Suspense>
    </CinsShell>
  );
}
