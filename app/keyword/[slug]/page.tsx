import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { KeywordArticleView } from "@/components/article/keyword/KeywordArticleView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  fetchRelatedArticles,
  fetchTacPhamGalleryForArticle,
  getArticleById,
  getKeywordArticleBySlug,
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

export default async function KeywordDetailPage({ params }: Props) {
  const { slug } = await params;

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

  const [lienQuan, tacPham] = await Promise.all([
    fetchRelatedArticles(article.id),
    fetchTacPhamGalleryForArticle(article.id),
  ]);

  const draftUiEnabled = isInlineArticleEditEnabled();
  const draftPersistEnabled = hasServiceRoleEnv();

  return (
    <CinsShell data-screen-label={`Keyword-${slug}`}>
      <KeywordArticleView
        article={article}
        lienQuan={lienQuan}
        tacPham={tacPham}
        draftUiEnabled={draftUiEnabled}
        draftPersistEnabled={draftPersistEnabled}
      />
      <SiteFooter />
    </CinsShell>
  );
}
