import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { CongDongPageClient } from "@/components/cong-dong/CongDongPageClient";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { congDongSuKienPath } from "@/lib/cong-dong/routes";
import { loadCongDongPageData } from "@/lib/cong-dong/queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getSuKienByIdPublic } from "@/lib/to-chuc/su-kien";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; suKienId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, suKienId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !suKienId?.trim()) {
    return { metadataBase, title: "Cộng đồng | CINs" };
  }

  const detail = await getSuKienByIdPublic(suKienId);
  const title = detail?.suKien.ten
    ? `${detail.suKien.ten} — Cộng đồng | CINs`
    : `Sự kiện — Cộng đồng | CINs`;
  const description =
    detail?.suKien.moTa?.trim() ||
    `Sự kiện tại cộng đồng trên CINs.`;
  const pagePath = congDongSuKienPath(slug, suKienId);

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      type: "article",
      siteName: "CINs",
      locale: "vi_VN",
      url: pagePath,
      title,
      description,
      images: detail?.suKien.coverSrc
        ? [{ url: detail.suKien.coverSrc, alt: detail.suKien.ten }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: detail?.suKien.coverSrc ? [detail.suKien.coverSrc] : undefined,
    },
  };
}

export default async function CongDongSuKienDetailPage({ params }: Props) {
  if (!hasSupabaseEnv()) notFound();

  const { slug, suKienId } = await params;
  if (!suKienId?.trim()) notFound();

  const session = await getCurrentSessionAndProfile();
  const data = await loadCongDongPageData({
    slug,
    viewerId: session?.profile?.id ?? null,
  });

  if (!data) notFound();

  return (
    <CinsShell data-screen-label={`Cong-dong-${slug}-su-kien`}>
      <CongDongPageClient
        initial={data}
        activeSuKienId={suKienId.trim()}
      />
    </CinsShell>
  );
}
