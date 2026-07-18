import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getStudioMetaBySlugCached } from "@/lib/to-chuc/studio-page-queries";
import { fetchJobOgContext } from "@/lib/to-chuc/tuyen-dung-og-fetch";
import { isStudioTabId } from "@/lib/to-chuc/studio-routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; tab: string; jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab, jobId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !isStudioTabId(tab)) {
    return { metadataBase, title: "Studio / Doanh nghiệp | CINs" };
  }

  const meta = await getStudioMetaBySlugCached(slug);
  if (!meta) return { metadataBase, title: "Không tìm thấy studio | CINs" };

  if (tab === "tuyen-dung") {
    const job = await fetchJobOgContext(slug, jobId);
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

  if (tab === "bai-dang" || tab === "showcase") {
    return {
      metadataBase,
      title: `Bài đăng — ${meta.ten} | CINs`,
      description: meta.moTa ?? `Bài đăng tại ${meta.ten} trên CINs.`,
    };
  }

  if (tab === "su-kien") {
    return {
      metadataBase,
      title: `Sự kiện — ${meta.ten} | CINs`,
      description: meta.moTa ?? `Sự kiện tại ${meta.ten} trên CINs.`,
    };
  }

  return { metadataBase, title: `${meta.ten} | CINs` };
}

/** URL sâu cho tin tuyển dụng hoặc bài đăng — UI render trong `[slug]/layout.tsx`. */
export default async function StudioDeepLinkPage({ params }: Props) {
  const { tab, jobId } = await params;
  if (!hasSupabaseEnv() || !isStudioTabId(tab)) notFound();
  if (tab === "tuyen-dung") {
    if (!jobId?.trim()) notFound();
    return null;
  }
  if (tab === "bai-dang" || tab === "showcase") {
    if (!jobId?.trim()) notFound();
    return null;
  }
  if (tab === "su-kien") {
    if (!jobId?.trim()) notFound();
    return null;
  }
  notFound();
}
