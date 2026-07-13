import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SuKienListingLoader } from "@/components/su-kien/SuKienListingLoader";
import { SuKienListingSkeleton } from "@/components/su-kien/SuKienListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const HUB_TITLE = "Sự kiện | CINs";
const HUB_DESC =
  "Open day, workshop, talkshow và festival ngành sáng tạo — khám phá sự kiện sắp diễn ra trên CINs.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/su-kien",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: [{ url: "/su-kien/opengraph-image", alt: HUB_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: ["/su-kien/opengraph-image"],
  },
};

export const dynamic = "force-dynamic";

export default async function SuKienListingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; suKien?: string }>;
}) {
  if (!hasSupabaseEnv()) notFound();

  const sp = await searchParams;

  return (
    <CinsShell data-screen-label="Su-kien-listing">
      <Suspense fallback={<SuKienListingSkeleton />}>
        <SuKienListingLoader
          initialTab={sp.tab}
          initialSuKienId={sp.suKien}
        />
      </Suspense>
    </CinsShell>
  );
}
