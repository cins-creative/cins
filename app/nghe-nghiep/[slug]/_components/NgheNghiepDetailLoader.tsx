import { ArticlePageView } from "@/components/article/ArticlePageView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  fetchRelatedArticles,
  fetchRelatedJobsLienQuan,
} from "@/lib/articles/queries";
import { getNgheArticleBySlugCached } from "@/lib/articles/nghe-page-queries";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { parseTagAggSort } from "@/lib/tag/aggregation-queries";
import {
  fetchEntityMilestones,
  fetchEntityTaggedUsers,
} from "@/lib/tag/entity-milestones-fetch";
import type { TagAggSort } from "@/lib/tag/aggregation-types";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import { notFound } from "next/navigation";

type Props = {
  slug: string;
  sort: TagAggSort;
};

export async function NgheNghiepDetailLoader({ slug, sort }: Props) {
  const article = await getNgheArticleBySlugCached(slug);
  if (!article) {
    notFound();
  }

  const session = await getCurrentSessionAndProfile();
  const viewerProfileId = session?.profile?.id ?? null;

  const [lienQuan, relatedJobsLienQuan, entityTaggedUsers, entityMilestones] =
    await Promise.all([
      fetchRelatedArticles(article.id),
      fetchRelatedJobsLienQuan(article.id),
      fetchEntityTaggedUsers(article.id),
      fetchEntityMilestones(article.id, sort, viewerProfileId),
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
        entityTaggedUsers={entityTaggedUsers}
        entityMilestones={entityMilestones}
        entitySort={sort}
        viewerProfileId={viewerProfileId}
        draftUiEnabled={draftUiEnabled}
        draftPersistEnabled={draftPersistEnabled}
      />
      <SiteFooter />
    </CinsShell>
  );
}
