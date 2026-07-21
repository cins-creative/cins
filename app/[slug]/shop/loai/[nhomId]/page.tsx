import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { buildJourneyMetadata } from "@/app/[slug]/_lib/build-journey-metadata";
import { CinsShell } from "@/components/cins/CinsShell";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ slug: string; nhomId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, nhomId } = await params;
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const path = `/${encodeURIComponent(slug)}/shop/loai/${encodeURIComponent(nhomId)}`;

  let title = "Loại hàng";
  if (nhomId !== "khac") {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("shop_nhom")
      .select("nhan")
      .eq("id", nhomId)
      .eq("da_xoa", false)
      .maybeSingle<{ nhan: string }>();
    if (data?.nhan) title = data.nhan;
  } else {
    title = "Khác";
  }

  const meta = await buildJourneyMetadata(slug, { view: "shop" });

  return {
    ...meta,
    title: `${title} · Shop`,
    robots: { index: true, follow: true },
    openGraph: {
      ...meta.openGraph,
      url: path,
      title: `${title} · Shop`,
    },
    alternates: { canonical: `${siteOrigin}${path}` },
  };
}

export default async function ShopLoaiPage({ params }: { params: Params }) {
  const { slug, nhomId } = await params;
  return (
    <CinsShell data-screen-label="Shop loại hàng">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <JourneyProfilePageLoader
          params={Promise.resolve({ slug })}
          searchParams={Promise.resolve({ view: "shop" })}
          storefront
          shopNhomId={nhomId}
        />
      </Suspense>
    </CinsShell>
  );
}
