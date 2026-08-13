import { ArticlePageView } from "@/components/article/ArticlePageView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  fetchRelatedArticles,
  fetchRelatedJobsLienQuan,
} from "@/lib/articles/queries";
import { fetchNgheRolePeople } from "@/lib/articles/nghe-role-people";
import { getNgheArticleBySlugCached } from "@/lib/articles/nghe-page-queries";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getArticleInlineAdminStatus } from "@/lib/articles/article-inline-admin";
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

  const [
    lienQuan,
    relatedJobsLienQuan,
    entityTaggedUsers,
    entityMilestones,
    rolePeople,
  ] = await Promise.all([
    fetchRelatedArticles(article.id),
    fetchRelatedJobsLienQuan(article.id),
    fetchEntityTaggedUsers(article.id),
    fetchEntityMilestones(article.id, sort, viewerProfileId),
    fetchNgheRolePeople(article),
  ]);

  const [draftUiEnabled, draftPersistEnabled] = await Promise.all([
    getArticleInlineAdminStatus(),
    Promise.resolve(hasServiceRoleEnv()),
  ]);

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
        rolePeople={rolePeople}
        draftUiEnabled={draftUiEnabled}
        draftPersistEnabled={draftPersistEnabled}
      />
      <SiteFooter />
    </CinsShell>
  );
}
