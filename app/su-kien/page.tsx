import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SuKienListingLoader } from "@/components/su-kien/SuKienListingLoader";
import { SuKienListingSkeleton } from "@/components/su-kien/SuKienListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sự kiện | CINs",
  description:
    "Open day, workshop, talkshow và festival ngành sáng tạo — khám phá sự kiện sắp diễn ra trên CINs.",
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
