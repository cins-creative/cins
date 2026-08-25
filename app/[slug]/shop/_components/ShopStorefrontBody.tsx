import { notFound, redirect } from "next/navigation";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";
import { shopLoaiHref, SHOP_SLUG_RESERVED } from "@/lib/shop/cua-hang-href";

function decodeShopSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function ShopStorefrontBody({
  params,
}: {
  params: Promise<{ slug: string; shopSlug: string }>;
}) {
  const { slug, shopSlug: rawShopSlug } = await params;
  const shopSlug = decodeShopSlug(rawShopSlug);

  if (SHOP_SLUG_RESERVED.has(shopSlug.trim().toLowerCase())) {
    notFound();
  }

  const resolved = await resolveShopSlugForOwnerSlug(slug);
  if (!resolved) notFound();

  if (shopSlug !== resolved.shopSlug) {
    redirect(resolved.href);
  }

  return (
    <JourneyProfilePageLoader
      params={Promise.resolve({ slug })}
      searchParams={Promise.resolve({ view: "shop" })}
      storefront
    />
  );
}

export async function ShopLoaiBody({
  params,
}: {
  params: Promise<{ slug: string; shopSlug: string; nhomId: string }>;
}) {
  const { slug, shopSlug: rawShopSlug, nhomId } = await params;
  const shopSlug = decodeShopSlug(rawShopSlug);

  if (SHOP_SLUG_RESERVED.has(shopSlug.trim().toLowerCase())) {
    notFound();
  }

  const resolved = await resolveShopSlugForOwnerSlug(slug);
  if (!resolved) notFound();

  if (shopSlug !== resolved.shopSlug) {
    redirect(shopLoaiHref(slug, resolved.shopSlug, nhomId));
  }

  return (
    <JourneyProfilePageLoader
      params={Promise.resolve({ slug })}
      searchParams={Promise.resolve({ view: "shop" })}
      storefront
      shopNhomId={nhomId}
    />
  );
}
