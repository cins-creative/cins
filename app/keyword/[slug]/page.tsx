import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { KeywordEntityArticleView } from "@/components/article/keyword/KeywordEntityArticleView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  fetchRelatedArticles,
  fetchTacPhamGalleryForArticle,
  getArticleById,
  getKeywordArticleBySlug,
} from "@/lib/articles/queries";
import { buildPublicPageMetadata } from "@/lib/seo/build-article-metadata";
import { parseTagAggSort } from "@/lib/tag/aggregation-queries";
import {
  fetchEntityMilestones,
  fetchEntityTaggedUsers,
} from "@/lib/tag/entity-milestones-fetch";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

function keywordPath(slug: string): string {
  return `/keyword/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return buildPublicPageMetadata({
      path: keywordPath(slug),
      title: "Keyword | CINs",
      noIndex: true,
    });
  }
  const article = await getKeywordArticleBySlug(slug);
  if (!article) {
    return buildPublicPageMetadata({
      path: keywordPath(slug),
      title: "Không tìm thấy | CINs",
      noIndex: true,
    });
  }
  const title =
    article.meta_title?.trim() ||
    `${article.tieu_de_viet?.trim() || article.tieu_de} | CINs`;
  const description =
    article.meta_description?.trim() || article.tom_tat?.trim() || undefined;
  return buildPublicPageMetadata({
    path: keywordPath(slug),
    title,
    description,
    ogType: "article",
  });
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

  if (article.trang_thai_noi_dung !== "published") {
    notFound();
  }

  const sort = parseTagAggSort(sortRaw);
  const session = await getCurrentSessionAndProfile();
  const viewerProfileId = session?.profile?.id ?? null;

  const [lienQuan, tacPham, entityTaggedUsers, entityMilestones] =
    await Promise.all([
      fetchRelatedArticles(article.id),
      fetchTacPhamGalleryForArticle(article.id),
      fetchEntityTaggedUsers(article.id),
      fetchEntityMilestones(article.id, sort, viewerProfileId),
    ]);

  return (
    <CinsShell data-screen-label={`Keyword-${slug}`}>
      <KeywordEntityArticleView
        article={article}
        lienQuan={lienQuan}
        tacPham={tacPham}
        entityTaggedUsers={entityTaggedUsers}
        entityMilestones={entityMilestones}
        entitySort={sort}
        viewerProfileId={viewerProfileId}
      />
      <SiteFooter />
    </CinsShell>
  );
}
