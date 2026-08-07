import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { CuaHangListingLoader } from "@/components/shop/CuaHangListingLoader";
import { hasSupabaseEnv } from "@/lib/supabase/env";

import "@/app/cua-hang/cua-hang-listing.css";

const HUB_TITLE = "Cửa hàng | CINs";
const HUB_DESC =
  "Danh sách cửa hàng đang mở trên CINs — goods, preorder và shop của người sáng tạo trong ngành.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/cua-hang",
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

function CuaHangListingSkeleton() {
  return (
    <div className="ch-list-page ch-list-page--loading" aria-busy="true">
      <div className="ch-list-toolbar">
        <div className="cins-frost-glass" aria-hidden />
        <div className="ch-list-toolbar-inner">
          <div className="ch-list-toolbar--skeleton" />
        </div>
      </div>
      <div className="ch-list-body">
        <div className="ch-list-hang-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="ch-list-hang-card ch-list-hang-card--skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function CuaHangListingPage() {
  if (!hasSupabaseEnv()) notFound();

  return (
    <CinsShell data-screen-label="Cua-hang">
      <Suspense fallback={<CuaHangListingSkeleton />}>
        <CuaHangListingLoader />
      </Suspense>
    </CinsShell>
  );
}
