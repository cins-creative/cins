import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { ShopLoaiBody } from "@/app/[slug]/shop/_components/ShopStorefrontBody";
import { CinsShell } from "@/components/cins/CinsShell";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { shopLoaiHref } from "@/lib/shop/cua-hang-href";
import { fetchShopLoaiDocumentMeta } from "@/lib/shop/shop-loai-og-fetch";

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
  const og = await fetchShopLoaiDocumentMeta(slug, shopSlug, nhomId);
  const titleBase = og?.title ?? (nhomId === "khac" ? "Khác" : "Loại hàng");
  const shopLabel = og?.shopTen ?? "Cửa hàng";
  const path = shopLoaiHref(slug, shopSlug, nhomId);
  const title = `${titleBase} · ${shopLabel}`;
  const description =
    og?.summary ??
    `${titleBase} tại ${shopLabel} trên CINs — mua bán sáng tạo.`;
  const ogImagePath = `${path}/opengraph-image`;
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";

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

export default function ShopLoaiPage({ params }: { params: Params }) {
  return (
    <CinsShell data-screen-label="Shop loại hàng">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <ShopLoaiBody params={params} />
      </Suspense>
    </CinsShell>
  );
}
