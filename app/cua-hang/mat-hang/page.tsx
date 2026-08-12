import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CuaHangListingLoader } from "@/components/shop/CuaHangListingLoader";
import { CuaHangListingSkeleton } from "@/app/cua-hang/CuaHangListingSkeleton";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const HUB_TITLE = "Mặt hàng | Cửa hàng CINs";
const HUB_DESC =
  "Duyệt mặt hàng (loại) từ các cửa hàng đang mở trên CINs — goods, preorder và merch người sáng tạo.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/cua-hang/mat-hang",
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

export default async function CuaHangMatHangPage() {
  if (!hasSupabaseEnv()) notFound();

  return (
    <Suspense fallback={<CuaHangListingSkeleton mode="mat-hang" />}>
      <CuaHangListingLoader browseMode="mat-hang" />
    </Suspense>
  );
}
