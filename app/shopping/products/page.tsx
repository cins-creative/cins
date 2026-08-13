import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CuaHangListingLoader } from "@/components/shop/CuaHangListingLoader";
import { CuaHangListingSkeleton } from "@/app/shopping/CuaHangListingSkeleton";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const HUB_TITLE = "Hàng | Cửa hàng CINs";
const HUB_DESC =
  "Duyệt hàng (mẫu / SKU) từ các cửa hàng đang mở trên CINs — goods, preorder và merch người sáng tạo.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/shopping/products",
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

export default async function CuaHangHangPage() {
  if (!hasSupabaseEnv()) notFound();

  return (
    <Suspense fallback={<CuaHangListingSkeleton mode="hang" />}>
      <CuaHangListingLoader browseMode="hang" />
    </Suspense>
  );
}
