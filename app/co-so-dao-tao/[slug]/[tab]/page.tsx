import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getTruongMetaBySlugCached } from "@/lib/truong/truong-page-queries";
import {
  isTruongTabId,
  TRUONG_TAB_LABELS,
} from "@/lib/truong/truong-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !isTruongTabId(tab)) {
    return { metadataBase, title: "Trường đại học | CINs" };
  }

  const meta = await getTruongMetaBySlugCached(slug);
  if (!meta) {
    return { metadataBase, title: "Không tìm thấy trường | CINs" };
  }

  const title = `${meta.ten} — ${TRUONG_TAB_LABELS[tab]} | CINs`;
  const description = `Thông tin ${TRUONG_TAB_LABELS[tab].toLowerCase()} tại ${meta.ten} trên CINs.`;
  const pagePath = `/co-so-dao-tao/${encodeURIComponent(slug)}`;
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
export default async function TruongTabPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || !isTruongTabId(tab)) notFound();
  return null;
}
