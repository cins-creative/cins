import { ArticlePageView } from "@/components/article/ArticlePageView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  fetchRelatedArticles,
  fetchRelatedJobsLienQuan,
} from "@/lib/articles/queries";
import { getNgheArticleBySlugCached } from "@/lib/articles/nghe-page-queries";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import { notFound } from "next/navigation";

type Props = {
  slug: string;
};

export async function NgheNghiepDetailLoader({ slug }: Props) {
  const article = await getNgheArticleBySlugCached(slug);
  if (!article) {
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
