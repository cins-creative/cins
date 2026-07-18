import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { getSuKienByIdPublic } from "@/lib/to-chuc/su-kien";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; suKienId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, suKienId } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !suKienId?.trim()) {
    return { metadataBase, title: "Cơ sở đào tạo | CINs" };
  }

  const [meta, detail] = await Promise.all([
    getCoSoMetaBySlugCached(slug),
    getSuKienByIdPublic(suKienId),
  ]);
  if (!meta) {
    return { metadataBase, title: "Không tìm thấy cơ sở | CINs" };
  }

  const title = detail?.suKien.ten
    ? `${detail.suKien.ten} — ${meta.ten} | CINs`
    : `Sự kiện — ${meta.ten} | CINs`;
  const description =
    detail?.suKien.moTa ??
    `Sự kiện tại ${meta.ten} trên CINs.`;
  const pagePath = `/co-so/${encodeURIComponent(slug)}/su-kien/${encodeURIComponent(suKienId)}`;

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
        ? [{ url: detail.suKien.coverSrc, alt: title }]
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

/** Chi tiết sự kiện URL — UI render trong `[slug]/layout.tsx`. */
export default async function CoSoSuKienDetailPage({ params }: Props) {
  const { suKienId } = await params;
  if (!hasSupabaseEnv() || !suKienId?.trim()) notFound();
  return null;
}
