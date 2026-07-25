import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { CO_SO_TAB_LABELS } from "@/lib/to-chuc/co-so-page-cau-hinh";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { isCoSoTabId } from "@/lib/to-chuc/co-so-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !isCoSoTabId(tab)) {
    return { metadataBase, title: "Cơ sở đào tạo | CINs" };
  }

  const meta = await getCoSoMetaBySlugCached(slug);
  if (!meta) {
    return { metadataBase, title: "Không tìm thấy cơ sở | CINs" };
  }

  const title = `${meta.ten} — ${CO_SO_TAB_LABELS[tab]} | CINs`;
  const description =
    meta.moTa ??
    `Trang cơ sở đào tạo ${meta.ten} trên CINs — ${CO_SO_TAB_LABELS[tab].toLowerCase()}.`;
  const pagePath = `/co-so/${encodeURIComponent(slug)}`;
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
export default async function CoSoTabPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || !isCoSoTabId(tab)) notFound();
  return null;
}
