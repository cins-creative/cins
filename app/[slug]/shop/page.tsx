import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";
import { buildShopStorefrontMetadata } from "@/lib/shop/build-shop-storefront-metadata";

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
  const path = resolved?.href ?? `/${encodeURIComponent(slug)}/shop`;
  return buildShopStorefrontMetadata(
    slug,
    path,
    resolved?.shopSlug ?? slug,
  );
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
