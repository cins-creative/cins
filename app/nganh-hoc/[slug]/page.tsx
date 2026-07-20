import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { NganhChiTietLoader } from "@/app/nganh-hoc/[slug]/_components/NganhChiTietLoader";
import { articlePublicHref } from "@/lib/articles/article-href";
import { getArticleSlugById } from "@/lib/articles/nghe-page-queries";
import { getNganhMetaBySlugCached } from "@/lib/nganh/nganh-page-queries";
import { buildPublicPageMetadata } from "@/lib/seo/build-article-metadata";
import { hasSupabaseEnv } from "@/lib/supabase/server";

import NganhChiTietLoading from "./loading";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function nganhPath(slug: string): string {
  return articlePublicHref("nganh_dao_tao", slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (!hasSupabaseEnv()) {
    return buildPublicPageMetadata({
      path: nganhPath(slug),
      title: "Ngành đào tạo | CINs",
      noIndex: true,
    });
  }

  const meta = await getNganhMetaBySlugCached(slug);
  if (!meta) {
    return buildPublicPageMetadata({
      path: nganhPath(slug),
      title: "Không tìm thấy ngành | CINs",
      noIndex: true,
    });
  }

  if (meta.trang_thai_noi_dung === "merged" && meta.merged_vao_id) {
    const targetSlug = await getArticleSlugById(meta.merged_vao_id);
    if (targetSlug) {
      return buildPublicPageMetadata({
        path: nganhPath(targetSlug),
        title: "Ngành đào tạo | CINs",
        noIndex: true,
      });
    }
    return buildPublicPageMetadata({
      path: nganhPath(slug),
      title: "Không tìm thấy ngành | CINs",
      noIndex: true,
    });
  }

  const displayName =
    meta.tieu_de_viet?.trim() || meta.tieu_de?.trim() || "Ngành đào tạo";
  const title =
    meta.meta_title?.trim() || `${displayName} — Ngành đào tạo | CINs`;
  const desc =
    meta.meta_description?.trim() ||
    meta.tom_tat?.trim() ||
    `Thông tin ngành ${displayName} — mã ngành, khối thi, môn học và trường đào tạo trên CINs.`;

  const pagePath = nganhPath(slug);
  return buildPublicPageMetadata({
    path: pagePath,
    title,
    description: desc,
    ogImagePath: `${pagePath}/opengraph-image`,
    ogType: "article",
  });
}

async function NganhChiTietGate({ slug }: { slug: string }) {
  if (!hasSupabaseEnv()) notFound();

  const meta = await getNganhMetaBySlugCached(slug);
  if (!meta) notFound();

  if (meta.trang_thai_noi_dung === "merged" && meta.merged_vao_id) {
    const targetSlug = await getArticleSlugById(meta.merged_vao_id);
    if (targetSlug) {
      permanentRedirect(nganhPath(targetSlug));
    }
    notFound();
  }

  if (meta.trang_thai_noi_dung !== "published") notFound();

  return <NganhChiTietLoader slug={slug} />;
}

export default async function NganhChiTietPage({ params }: Props) {
  const { slug } = await params;

  return (
    <Suspense fallback={<NganhChiTietLoading />}>
      <NganhChiTietGate slug={slug} />
    </Suspense>
  );
}
