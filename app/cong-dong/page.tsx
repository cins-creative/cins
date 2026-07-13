import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CongDongListingLoader } from "@/components/cong-dong/CongDongListingLoader";
import { CinsShell } from "@/components/cins/CinsShell";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const HUB_TITLE = "Cộng đồng | CINs";
const HUB_DESC =
  "Danh sách cộng đồng nghề trên CINs — thảo luận, chia sẻ kinh nghiệm và kết nối người trong ngành sáng tạo.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/cong-dong",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: [{ url: "/cong-dong/opengraph-image", alt: HUB_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: ["/cong-dong/opengraph-image"],
  },
};

export const dynamic = "force-dynamic";

function CongDongListingSkeleton() {
  return (
    <div className="cd-list-page cd-list-page--loading" aria-busy="true">
      <div className="cd-list-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="cd-list-card cd-list-card--skeleton" />
        ))}
      </div>
    </div>
  );
}

export default async function CongDongListingPage({
  searchParams,
}: {
  searchParams: Promise<{ linh_vuc?: string; nganh?: string; mine?: string }>;
}) {
  if (!hasSupabaseEnv()) notFound();

  const sp = await searchParams;
  const mineRaw = sp.mine?.trim().toLowerCase();
  const initialMine = mineRaw === "1" || mineRaw === "true";

  return (
    <CinsShell data-screen-label="Cong-dong">
      <Suspense fallback={<CongDongListingSkeleton />}>
        <CongDongListingLoader
          initialLinhVucSlug={sp.linh_vuc ?? null}
          initialNganhSlug={sp.nganh ?? null}
          initialMine={initialMine}
        />
      </Suspense>
    </CinsShell>
  );
}
