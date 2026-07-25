import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { fetchJobOgContext } from "@/lib/to-chuc/tuyen-dung-og-fetch";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, jobId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !jobId?.trim()) {
    return { metadataBase, title: "Cơ sở đào tạo | CINs" };
  }

  const [meta, job] = await Promise.all([
    getCoSoMetaBySlugCached(slug),
    fetchJobOgContext(slug, jobId),
  ]);
  if (!meta) {
    return { metadataBase, title: "Không tìm thấy cơ sở | CINs" };
  }

  const title = job?.title
    ? `${job.title} — ${meta.ten} | CINs`
    : `Tuyển dụng — ${meta.ten} | CINs`;
  const description =
    job?.summary ?? `Vị trí tuyển dụng tại ${meta.ten} trên CINs.`;
  const pagePath = `/co-so/${encodeURIComponent(slug)}/tuyen-dung/${encodeURIComponent(jobId)}`;
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

/** Chi tiết tin tuyển dụng URL — UI render trong `[slug]/layout.tsx`. */
export default async function CoSoTuyenDungDetailPage({ params }: Props) {
  const { jobId } = await params;
  if (!hasSupabaseEnv() || !jobId?.trim()) notFound();
  return null;
}
