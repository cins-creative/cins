import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { STUDIO_TAB_LABELS } from "@/lib/to-chuc/studio-page-config";
import { getStudioMetaBySlugCached } from "@/lib/to-chuc/studio-page-queries";
import { isStudioTabId } from "@/lib/to-chuc/studio-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !isStudioTabId(tab)) {
    return { metadataBase, title: "Studio / Doanh nghiệp | CINs" };
  }

  const meta = await getStudioMetaBySlugCached(slug);
  if (!meta) return { metadataBase, title: "Không tìm thấy studio | CINs" };

  const title = `${meta.ten} — ${STUDIO_TAB_LABELS[tab]} | CINs`;
  const description =
    meta.moTa ??
    `Trang studio / doanh nghiệp ${meta.ten} trên CINs — ${STUDIO_TAB_LABELS[tab].toLowerCase()}.`;
  const pagePath = `/studio/${encodeURIComponent(slug)}`;
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
      images: [{ url: ogImagePath, alt: meta.ten }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

/** Tab URL — UI render trong `[slug]/layout.tsx`. */
export default async function StudioTabPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || !isStudioTabId(tab)) notFound();
  return null;
}
