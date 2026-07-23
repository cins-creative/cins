import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { buildJourneyMetadata } from "@/app/[slug]/_lib/build-journey-metadata";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";

type Params = Promise<{ slug: string }>;

/**
 * Entry cũ `/{slug}/shop` → redirect canonical `/{slug}/shop/{shopSlug}`.
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveShopSlugForOwnerSlug(slug);
  const meta = await buildJourneyMetadata(slug, { view: "shop" });
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const path = resolved?.href ?? `/${encodeURIComponent(slug)}/shop`;
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

export default async function UserShopEntryPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const resolved = await resolveShopSlugForOwnerSlug(slug);
  if (!resolved) notFound();
  redirect(resolved.href);
}
