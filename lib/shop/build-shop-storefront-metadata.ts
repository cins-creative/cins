import type { Metadata } from "next";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getCinsLocale } from "@/lib/locale/server";
import { ogLocale } from "@/lib/locale/types";
import { fetchShopStorefrontOgContext } from "@/lib/shop/shop-loai-og-fetch";

export async function buildShopStorefrontMetadata(
  ownerSlug: string,
  path: string,
  shopSlug: string,
): Promise<Metadata> {
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const locale = await getCinsLocale();
  const og = await fetchShopStorefrontOgContext(ownerSlug, shopSlug);
  const shopLabel = og?.shopTen ?? "Cửa hàng";
  const title = `${shopLabel} · Cửa hàng · CINS`;
  const description =
    og?.summary ?? `${shopLabel} trên CINs — mua bán sáng tạo.`;
  const ogImagePath = `${path}/opengraph-image`;

  return {
    metadataBase: new URL(siteOrigin),
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "CINs",
      locale: ogLocale(locale),
      url: path,
      title,
      description,
      images: [
        {
          url: ogImagePath,
          alt: shopLabel,
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
      images: [{ url: ogImagePath, alt: shopLabel, width: 1200, height: 630 }],
    },
    alternates: { canonical: `${siteOrigin}${path}` },
  };
}
