import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";
import { shopLoaiHref, SHOP_SLUG_RESERVED } from "@/lib/shop/cua-hang-href";
import { fetchShopLoaiOgContext } from "@/lib/shop/shop-loai-og-fetch";

type Params = Promise<{ slug: string; shopSlug: string; nhomId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, shopSlug: rawShopSlug, nhomId } = await params;
  let shopSlug = rawShopSlug;
  try {
    shopSlug = decodeURIComponent(rawShopSlug);
  } catch {
    /* keep raw */
  }
  const resolved = await resolveShopSlugForOwnerSlug(slug);
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const path = resolved
    ? shopLoaiHref(slug, resolved.shopSlug, nhomId)
    : shopLoaiHref(slug, shopSlug, nhomId);
  const canonicalShopSlug = resolved?.shopSlug ?? shopSlug;

  const og = await fetchShopLoaiOgContext(slug, canonicalShopSlug, nhomId);
  const titleBase = og?.title ?? (nhomId === "khac" ? "Khác" : "Loại hàng");
  const shopLabel = og?.shopTen ?? resolved?.ten?.trim() ?? "Cửa hàng";
  const title = `${titleBase} · ${shopLabel}`;
  const description =
    og?.summary ??
    `${titleBase} tại ${shopLabel} trên CINs — mua bán sáng tạo.`;
  const ogImagePath = `${path}/opengraph-image`;

  return {
    metadataBase: new URL(siteOrigin),
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "CINs",
      locale: "vi_VN",
      url: path,
      title,
      description,
      images: [
        {
          url: ogImagePath,
          alt: titleBase,
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: ogImagePath, alt: titleBase, width: 1200, height: 630 }],
    },
    alternates: { canonical: `${siteOrigin}${path}` },
  };
}

export default async function ShopLoaiPage({ params }: { params: Params }) {
  const { slug, shopSlug: rawShopSlug, nhomId } = await params;
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
    redirect(shopLoaiHref(slug, resolved.shopSlug, nhomId));
  }

  return (
    <CinsShell data-screen-label="Shop loại hàng">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <JourneyProfilePageLoader
          params={Promise.resolve({ slug })}
          searchParams={Promise.resolve({ view: "shop" })}
          storefront
          shopNhomId={nhomId}
        />
      </Suspense>
    </CinsShell>
  );
}
