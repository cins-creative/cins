import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { ShopStorefrontBody } from "@/app/[slug]/shop/_components/ShopStorefrontBody";
import { CinsShell } from "@/components/cins/CinsShell";
import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";
import { buildShopStorefrontMetadata } from "@/lib/shop/build-shop-storefront-metadata";

type Params = Promise<{ slug: string; shopSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, shopSlug } = await params;
  const resolved = await resolveShopSlugForOwnerSlug(slug);
  const path =
    resolved?.href ??
    `/${encodeURIComponent(slug)}/shop/${encodeURIComponent(shopSlug)}`;
  return buildShopStorefrontMetadata(
    slug,
    path,
    resolved?.shopSlug ?? shopSlug,
  );
}

export default function UserShopStorefrontPage({ params }: { params: Params }) {
  return (
    <CinsShell data-screen-label="Shop">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <ShopStorefrontBody params={params} />
      </Suspense>
    </CinsShell>
  );
}
