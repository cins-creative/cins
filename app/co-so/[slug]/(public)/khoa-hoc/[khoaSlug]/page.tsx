import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getCoSoMetaBySlugCached } from "@/lib/to-chuc/co-so-page-queries";
import { fetchKhoaHocOgContext } from "@/lib/to-chuc/khoa-hoc-og-fetch";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; khoaSlug: string }> };

function titleFromKhoaSlug(khoaSlug: string): string {
  return khoaSlug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, khoaSlug } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");

  if (!hasSupabaseEnv() || !khoaSlug?.trim()) {
    return { metadataBase, title: "Cơ sở đào tạo | CINs" };
  }

  const [meta, og] = await Promise.all([
    getCoSoMetaBySlugCached(slug),
    fetchKhoaHocOgContext(slug, khoaSlug),
  ]);
  if (!meta) {
    return { metadataBase, title: "Không tìm thấy cơ sở | CINs" };
  }

  const tenKhoa = og?.title || titleFromKhoaSlug(khoaSlug);
  const title = `${tenKhoa} — ${meta.ten} | CINs`;
  const description =
    og?.summary || `Khóa học ${tenKhoa} tại ${meta.ten} trên CINs.`;
  const pagePath = `/co-so/${encodeURIComponent(slug)}/khoa-hoc/${encodeURIComponent(khoaSlug)}`;
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
      images: [{ url: ogImagePath, alt: tenKhoa }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

/** Chi tiết khóa URL — UI render trong `[slug]/layout.tsx`. */
export default async function CoSoKhoaHocDetailPage({ params }: Props) {
  const { khoaSlug } = await params;
  if (!hasSupabaseEnv() || !khoaSlug?.trim()) notFound();
  return null;
}
