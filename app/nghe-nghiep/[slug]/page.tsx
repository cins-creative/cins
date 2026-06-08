import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { NgheNghiepDetailLoader } from "@/app/nghe-nghiep/[slug]/_components/NgheNghiepDetailLoader";
import {
  getArticleSlugById,
  getNgheArticleMetaBySlug,
} from "@/lib/articles/nghe-page-queries";
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
    return { title: "Nghề nghiệp | CINs" };
  }

  const meta = await getNgheArticleMetaBySlug(slug);
  if (!meta) {
    return { title: "Không tìm thấy | CINs" };
  }

  const title =
    meta.meta_title?.trim() ||
    `${meta.tieu_de_viet?.trim() || meta.tieu_de} | CINs`;
  const description =
    meta.meta_description?.trim() || meta.tom_tat?.trim() || undefined;
  return { title, description };
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
      permanentRedirect(`/nghe-nghiep/${encodeURIComponent(targetSlug)}`);
    }
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
