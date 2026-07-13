import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getStudioMetaBySlugCached } from "@/lib/to-chuc/studio-page-queries";
import { fetchJobOgContext } from "@/lib/to-chuc/tuyen-dung-og-fetch";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string; jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab, jobId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || tab !== "tuyen-dung") {
    return { metadataBase, title: "Tuyển dụng | CINs" };
  }

  const [meta, job] = await Promise.all([
    getStudioMetaBySlugCached(slug),
    fetchJobOgContext(slug, jobId),
  ]);
  if (!meta) return { metadataBase, title: "Không tìm thấy studio | CINs" };

  const title = job?.title
    ? `${job.title} — ${meta.ten} | CINs`
    : `Tuyển dụng — ${meta.ten} | CINs`;
  const description =
    job?.summary ??
    meta.moTa ??
    `Chi tiết vị trí tuyển dụng tại ${meta.ten} trên CINs.`;
  const pagePath = `/studio/${encodeURIComponent(slug)}/${tab}/${encodeURIComponent(jobId)}`;
  const ogImagePath = `${pagePath}/opengraph-image`;

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
      images: [{ url: ogImagePath, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

/** URL sâu cho một tin tuyển dụng — UI popup render trong `[slug]/layout.tsx`. */
export default async function StudioJobPage({ params }: Props) {
  const { tab } = await params;
  if (!hasSupabaseEnv() || tab !== "tuyen-dung") notFound();
  return null;
}
