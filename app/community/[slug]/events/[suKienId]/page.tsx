import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { CongDongPageClient } from "@/components/cong-dong/CongDongPageClient";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { congDongSuKienCardPath, congDongSuKienPath } from "@/lib/cong-dong/routes";
import { loadCongDongPageData } from "@/lib/cong-dong/queries";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getSuKienByPublicKey } from "@/lib/to-chuc/su-kien";
import { looksLikeUuid } from "@/lib/to-chuc/su-kien-slug";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; suKienId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, suKienId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !suKienId?.trim()) {
    return { metadataBase, title: "Cộng đồng | CINs" };
  }

  const detail = await getSuKienByPublicKey(suKienId);
  const title = detail?.suKien.ten
    ? `${detail.suKien.ten} — Cộng đồng | CINs`
    : `Sự kiện — Cộng đồng | CINs`;
  const description =
    detail?.suKien.moTa?.trim() ||
    `Sự kiện tại cộng đồng trên CINs.`;
  const pagePath = detail
    ? congDongSuKienCardPath(slug, detail.suKien)
    : congDongSuKienPath(slug, suKienId);

  return {
    metadataBase,
    title,
    description,
    alternates: { canonical: pagePath },
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

  const { slug, suKienId: rawKey } = await params;
  const key = rawKey?.trim() ?? "";
  if (!key) notFound();

  const detail = await getSuKienByPublicKey(key);
  if (!detail || detail.orgSlug !== slug.trim()) notFound();

  const canonical = congDongSuKienCardPath(slug, detail.suKien);
  if (
    looksLikeUuid(key) &&
    detail.suKien.slug?.trim() &&
    key.toLowerCase() !== detail.suKien.slug.trim().toLowerCase()
  ) {
    permanentRedirect(canonical);
  }
  if (
    detail.suKien.slug?.trim() &&
    key !== detail.suKien.slug.trim() &&
    !looksLikeUuid(key)
  ) {
    permanentRedirect(congDongSuKienPath(slug, detail.suKien.slug.trim()));
  }

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
        activeSuKienId={detail.suKien.id}
      />
    </CinsShell>
  );
}
