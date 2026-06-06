import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CongDongListingLoader } from "@/components/cong-dong/CongDongListingLoader";
import { CinsShell } from "@/components/cins/CinsShell";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Cộng đồng | CINs",
  description:
    "Danh sách cộng đồng nghề trên CINs — thảo luận, chia sẻ kinh nghiệm và kết nối người trong ngành sáng tạo.",
};

export const dynamic = "force-dynamic";

function CongDongListingSkeleton() {
  return (
    <div className="cd-list-page cd-list-page--loading" aria-busy="true">
      <div className="cd-list-hero cd-list-hero--skeleton" />
      <div className="cd-list-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="cd-list-card cd-list-card--skeleton" />
        ))}
      </div>
    </div>
  );
}

export default function CongDongListingPage() {
  if (!hasSupabaseEnv()) notFound();

  return (
    <CinsShell data-screen-label="Cong-dong">
      <Suspense fallback={<CongDongListingSkeleton />}>
        <CongDongListingLoader />
      </Suspense>
    </CinsShell>
  );
}
