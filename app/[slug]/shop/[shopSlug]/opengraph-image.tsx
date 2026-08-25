import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { loadOgFonts } from "@/lib/journey/og-fonts";
import { withOgImageCacheHeaders } from "@/lib/journey/og-image-url";
import { ShopStorefrontOgShareCard } from "@/lib/shop/shop-loai-og-card";
import { fetchShopStorefrontOgContext } from "@/lib/shop/shop-loai-og-fetch";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cửa hàng trên CINs";
export const runtime = "nodejs";

type Params = Promise<{ slug: string; shopSlug: string }>;

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

export default async function Image({ params }: { params: Params }) {
  const { slug, shopSlug: rawShopSlug } = await params;
  let shopSlug = rawShopSlug;
  try {
    shopSlug = decodeURIComponent(rawShopSlug);
  } catch {
    /* keep raw */
  }

  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;

  const [ctx, fonts] = await Promise.all([
    fetchShopStorefrontOgContext(slug, shopSlug),
    loadOgFonts(),
  ]);

  const element = ctx ? (
    <ShopStorefrontOgShareCard ctx={ctx} logoUrl={logoUrl} />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        fontFamily: "Be Vietnam Pro",
        background:
          "linear-gradient(135deg, #ffffff 0%, #f1f5f9 55%, #fff7ed 100%)",
        color: "#0f172a",
        padding: 56,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="CINs"
        width={56}
        height={56}
        style={{ width: 56, height: 56, borderRadius: 14 }}
      />
      <div style={{ fontSize: 52, fontWeight: 800, textAlign: "center" }}>
        Cửa hàng
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#64748b" }}>
        Mua bán sáng tạo trên CINs
      </div>
    </div>
  );

  return withOgImageCacheHeaders(
    new ImageResponse(element, { ...size, fonts }),
  );
}
