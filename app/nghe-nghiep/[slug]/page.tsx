import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { NgheNghiepDetailLoader } from "@/app/nghe-nghiep/[slug]/_components/NgheNghiepDetailLoader";
import {
  getArticleSlugById,
  getNgheArticleMetaBySlug,
} from "@/lib/articles/nghe-page-queries";
import { ngheNghiepDetailHref } from "@/lib/cins/hubPaths";
import { buildPublicPageMetadata } from "@/lib/seo/build-article-metadata";
import { parseTagAggSort } from "@/lib/tag/aggregation-queries";
import type { TagAggSort } from "@/lib/tag/aggregation-types";
import { hasSupabaseEnv } from "@/lib/supabase/server";

import NgheNghiepDetailLoading from "./loading";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (!hasSupabaseEnv()) {
    return buildPublicPageMetadata({
      path: ngheNghiepDetailHref(slug),
      title: "Nghề nghiệp | CINs",
      noIndex: true,
    });
  }

  const meta = await getNgheArticleMetaBySlug(slug);
  if (!meta) {
    return buildPublicPageMetadata({
      path: ngheNghiepDetailHref(slug),
      title: "Không tìm thấy | CINs",
      noIndex: true,
    });
  }

  if (meta.trang_thai_noi_dung === "merged" && meta.merged_vao_id) {
    const targetSlug = await getArticleSlugById(meta.merged_vao_id);
    if (targetSlug) {
      const targetPath = ngheNghiepDetailHref(targetSlug);
      return buildPublicPageMetadata({
        path: targetPath,
        title:
          meta.meta_title?.trim() ||
          `${meta.tieu_de_viet?.trim() || meta.tieu_de} | CINs`,
        description:
          meta.meta_description?.trim() || meta.tom_tat?.trim() || undefined,
        noIndex: true,
      });
    }
    return buildPublicPageMetadata({
      path: ngheNghiepDetailHref(slug),
      title: "Không tìm thấy | CINs",
      noIndex: true,
    });
  }

  const title =
    meta.meta_title?.trim() ||
    `${meta.tieu_de_viet?.trim() || meta.tieu_de} | CINs`;
  const description =
    meta.meta_description?.trim() || meta.tom_tat?.trim() || undefined;

  const pagePath = ngheNghiepDetailHref(slug);
  const ogImagePath = `${pagePath}/opengraph-image`;

  return buildPublicPageMetadata({
    path: pagePath,
    title,
    description,
    ogImagePath,
    ogType: "article",
  });
}

async function NgheNghiepDetailGate({
  slug,
  sort,
}: {
  slug: string;
  sort: TagAggSort;
}) {
  const meta = await getNgheArticleMetaBySlug(slug);
  if (!meta) {
    notFound();
  }

  if (meta.trang_thai_noi_dung === "merged" && meta.merged_vao_id) {
    const targetSlug = await getArticleSlugById(meta.merged_vao_id);
    if (targetSlug) {
      permanentRedirect(ngheNghiepDetailHref(targetSlug));
    }
    notFound();
  }

  if (meta.trang_thai_noi_dung !== "published") {
    notFound();
  }

  return <NgheNghiepDetailLoader slug={slug} sort={sort} />;
}

export default async function NgheNghiepDetailPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { sort: sortRaw } = await searchParams;
  const sort = parseTagAggSort(sortRaw);

  if (!hasSupabaseEnv()) {
    notFound();
  }

  return (
    <Suspense fallback={<NgheNghiepDetailLoading />}>
      <NgheNghiepDetailGate slug={slug} sort={sort} />
    </Suspense>
  );
}
