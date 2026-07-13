import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { CongDongPageClient } from "@/components/cong-dong/CongDongPageClient";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { fetchCongDongOgContext } from "@/lib/cong-dong/cong-dong-og-fetch";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadCongDongPageData } from "@/lib/cong-dong/queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/** Pulse theo phiên; face pile + career map fetch realtime qua API. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  const og = hasSupabaseEnv() ? await fetchCongDongOgContext(slug) : null;
  const name = og?.title || slug;
  const title = `${name} — Cộng đồng | CINs`;
  const description =
    og?.summary || `Cộng đồng ${name} trên CINs — thảo luận và kết nối người trong ngành sáng tạo.`;
  const pagePath = `/cong-dong/${encodeURIComponent(slug)}`;
  const ogImagePath = `${pagePath}/opengraph-image`;

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      type: "profile",
      siteName: "CINs",
      locale: "vi_VN",
      url: pagePath,
      title,
      description,
      images: [{ url: ogImagePath, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

export default async function CongDongDetailPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();

  const { slug } = await params;
  const session = await getCurrentSessionAndProfile();
  const data = await loadCongDongPageData({
    slug,
    viewerId: session?.profile?.id ?? null,
  });

  if (!data) notFound();

  return (
    <CinsShell data-screen-label={`Cong-dong-${slug}`}>
      <CongDongPageClient initial={data} />
    </CinsShell>
  );
}
