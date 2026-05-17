import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ArticlePageView } from "@/components/article/ArticlePageView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  fetchRelatedArticles,
  fetchRelatedJobsLienQuan,
  getArticleById,
  getNgheArticleBySlug,
} from "@/lib/articles/queries";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return { title: "Nghề nghiệp | CINs" };
  }
  const article = await getNgheArticleBySlug(slug);
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

export default async function NgheNghiepDetailPage({ params }: Props) {
  const { slug } = await params;

  if (!hasSupabaseEnv()) {
    notFound();
  }

  const article = await getNgheArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  if (article.trang_thai_noi_dung === "merged" && article.merged_vao_id) {
    const target = await getArticleById(article.merged_vao_id);
    if (target?.slug) {
      permanentRedirect(`/nghe-nghiep/${encodeURIComponent(target.slug)}`);
    }
    notFound();
  }

  const [lienQuan, relatedJobsLienQuan] = await Promise.all([
    fetchRelatedArticles(article.id),
    fetchRelatedJobsLienQuan(article.id),
  ]);

  const draftUiEnabled = isInlineArticleEditEnabled();
  const draftPersistEnabled = hasServiceRoleEnv();

  return (
    <CinsShell data-screen-label={`Nghe-nghiep-${slug}`}>
      <ArticlePageView
        article={article}
        lienQuan={lienQuan}
        tacPham={[]}
        truongRows={[]}
        relatedJobsLienQuan={relatedJobsLienQuan}
        draftUiEnabled={draftUiEnabled}
        draftPersistEnabled={draftPersistEnabled}
      />
      <SiteFooter />
    </CinsShell>
  );
}
