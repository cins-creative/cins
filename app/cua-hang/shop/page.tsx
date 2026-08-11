import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CuaHangListingLoader } from "@/components/shop/CuaHangListingLoader";
import { CuaHangListingSkeleton } from "@/app/cua-hang/CuaHangListingSkeleton";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const HUB_TITLE = "Shop | Cửa hàng CINs";
const HUB_DESC =
  "Danh sách cửa hàng đang mở trên CINs — goods, preorder và shop của người sáng tạo trong ngành.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/cua-hang/shop",
    title: HUB_TITLE,
    description: HUB_DESC,
  },
  twitter: {
    card: "summary",
    title: HUB_TITLE,
    description: HUB_DESC,
  },
};

export const dynamic = "force-dynamic";

export default async function CuaHangShopPage() {
  if (!hasSupabaseEnv()) notFound();

  return (
    <Suspense fallback={<CuaHangListingSkeleton mode="shop" />}>
      <CuaHangListingLoader browseMode="shop" />
    </Suspense>
  );
}
