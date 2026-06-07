import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { TagAggregationView } from "@/components/tag/TagAggregationView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  getArticleById,
  getKeywordArticleBySlug,
} from "@/lib/articles/queries";
import { parseTagAggSort } from "@/lib/tag/aggregation-queries";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return { title: "Keyword | CINs" };
  }
  const article = await getKeywordArticleBySlug(slug);
  if (!article) {
    return { title: "Không tìm thấy | CINs" };
  }
  const title =
    article.meta_title?.trim() ||
    `${article.tieu_de_viet?.trim() || article.tieu_de} | CINs`;
  const description =
    article.meta_description?.trim() || article.tom_tat?.trim() || undefined;
  return { title, description };
}

export default async function KeywordDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort: sortRaw } = await searchParams;

  if (!hasSupabaseEnv()) {
    notFound();
  }

  const article = await getKeywordArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  if (article.trang_thai_noi_dung === "merged" && article.merged_vao_id) {
    const target = await getArticleById(article.merged_vao_id);
    if (target?.slug) {
      permanentRedirect(`/keyword/${encodeURIComponent(target.slug)}`);
    }
    notFound();
  }

  const sort = parseTagAggSort(sortRaw);
  const daVerify =
    (article as { da_verify?: boolean | null }).da_verify === true;

  return (
    <CinsShell data-screen-label={`Keyword-${slug}`}>
      <TagAggregationView
        article={{
          id: article.id,
          slug: article.slug,
          tieu_de: article.tieu_de,
          tom_tat: article.tom_tat,
          da_verify: daVerify,
          loai_bai_viet: "keyword",
        }}
        sort={sort}
      />
      <SiteFooter />
    </CinsShell>
  );
}
