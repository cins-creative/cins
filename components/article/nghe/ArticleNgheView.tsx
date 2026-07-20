import type { ArticleBaiViet, ArticleCard } from "@/lib/articles/types";
import { buildNgheLeadSourceFromNoiDung } from "@/lib/articles/nghe-lead-source-build";
import type { RelatedJobLienQuanRow } from "@/lib/articles/related-jobs-dynamic";
import type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";
import { getVideoUrlFromArticleMeta } from "@/lib/articles/lead-video-url";
import { resolveArticleThumbnailOnlySync } from "@/lib/bai-viet/thumbnail";
import { ContributionTabPanel } from "@/components/article/contribution/ContributionTabPanel";
import { EntityArticleAttribution } from "@/components/article/entity/EntityArticleAttribution";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
import { NgheArticleDraftProvider } from "@/components/article/nghe/NgheArticleDraftContext";
import { NgheDraftContentModal } from "@/components/article/nghe/NgheDraftContentModal";
import {
  NgheHeroInlineDraft,
  NgheLeadInlineDraft,
} from "@/components/article/nghe/NgheHeroLeadInlineDraft";
import { NgheRolePeopleSection } from "@/components/article/nghe/NgheRolePeopleSection";
import { NgheSeoJsonLd } from "@/components/article/nghe/NgheSeoJsonLd";
import { NgheLayoutStatic } from "@/components/article/nghe/static/NgheLayoutStatic";
import { ngheNghiepDetailHref } from "@/lib/cins/hubPaths";
import {
  fetchArticleAttribution,
  mapAttributionForDisplay,
} from "@/lib/article/dong-gop/attribution";
import {
  entityCanonicalLeadHtml,
  hasEntityCanonicalContent,
} from "@/lib/article/dong-gop/canonical-content";
import { listDongGopForEntityTab } from "@/lib/article/dong-gop/public-list";

type ArticleNgheViewProps = {
  article: ArticleBaiViet;
  /** Cạnh `article_lien_quan` → `article_bai_viet` (đã resolve trong page). */
  lienQuan?: ArticleCard[];
  /** `LIEN_QUAN` → bài `nghe` — chèn vào `data-dynamic="related-jobs"` trong HTML `noi_dung`. */
  relatedJobsLienQuan?: RelatedJobLienQuanRow[];
  /** Bật UI sửa inline (admin CINs — nút hero + form). */
  showDraftBar?: boolean;
  /** Cho phép ghi DB — thiếu key thì chỉ xem/chỉnh local, nút Lưu tắt. */
  draftPersistEnabled?: boolean;
  entityTaggedUsers?: TagAggUser[];
  entityMilestones?: ReadonlyArray<MilestoneItem>;
  entitySort?: TagAggSort;
  viewerProfileId?: string | null;
  rolePeople?: ReadonlyArray<NgheRolePerson>;
};

export async function ArticleNgheView({
  article,
  lienQuan = [],
  relatedJobsLienQuan = [],
  showDraftBar = false,
  draftPersistEnabled = false,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
  rolePeople = [],
}: ArticleNgheViewProps) {
  const slugPath = ngheNghiepDetailHref(article.slug);
  const attributionDisplay = mapAttributionForDisplay(
    await fetchArticleAttribution(article.id),
  );
  const heroAttribution = (
    <EntityArticleAttribution data={attributionDisplay} />
  );
  const peopleBelowHero =
    rolePeople.length > 0 ? (
      <NgheRolePeopleSection people={rolePeople} />
    ) : null;
  const leadSource = buildNgheLeadSourceFromNoiDung(
    entityCanonicalLeadHtml(article.noi_dung) ?? article.noi_dung_markdown,
    relatedJobsLienQuan,
  );
  const leadVideoUrl = getVideoUrlFromArticleMeta(article.meta);
  const heroThumbnailUrl = resolveArticleThumbnailOnlySync(article.thumbnail);
  const canonicalEmpty = !hasEntityCanonicalContent(article.noi_dung);
  const isLoggedIn = viewerProfileId != null;
  const contributionData = await listDongGopForEntityTab(
    article.id,
    viewerProfileId,
    {
      loaiBaiViet: "nghe",
      entityTitle: article.tieu_de,
      entitySeed: {
        tieu_de: article.tieu_de,
        tieu_de_viet: article.tieu_de_viet ?? "",
        tieu_de_eng: article.tieu_de_eng ?? "",
        tom_tat: article.tom_tat ?? "",
        video_url: leadVideoUrl ?? "",
        thumbnail: article.thumbnail ?? "",
      },
    },
  );
  const contributionPanel = (
    <ContributionTabPanel
      items={contributionData.items}
      count={contributionData.count}
      isLoggedIn={isLoggedIn}
      viewerHasDraft={contributionData.viewerHasDraft}
      loginNext={slugPath}
      idBaiViet={article.id}
      articleTitle={article.tieu_de}
      loaiBaiViet="nghe"
      viewerEditor={contributionData.viewerEditor}
    />
  );
  const entityTabProps = {
    contribution: contributionPanel,
    canonicalEmpty,
    isLoggedIn,
    loginNext: slugPath,
  };

  return (
    <div className="article-page arv2 arv2-nghe">
      <NgheSeoJsonLd article={article} slugPath={slugPath} />
      {showDraftBar ? (
        <NgheArticleDraftProvider
          article={article}
          relatedJobsLienQuan={relatedJobsLienQuan}
          persistEnabled={draftPersistEnabled}
          canEdit
          resetKey={`${article.id}-${article.cap_nhat_luc}`}
        >
          <NgheLayoutStatic
            lienQuan={lienQuan}
            entityTaggedUsers={entityTaggedUsers}
            entityMilestones={entityMilestones}
            entitySort={entitySort}
            viewerProfileId={viewerProfileId}
            rolePeople={rolePeople}
            heroThumbnailUrl={heroThumbnailUrl}
            {...entityTabProps}
            heroBlock={
              <NgheHeroInlineDraft
                leadVideoUrl={leadVideoUrl}
                heroThumbnailUrl={heroThumbnailUrl}
                belowInner={peopleBelowHero}
              />
            }
            leadBlock={
              <NgheLeadInlineDraft
                leadVideoUrl={leadVideoUrl}
                heroThumbnailUrl={heroThumbnailUrl}
              />
            }
          />
          <NgheDraftContentModal />
          <InlineArticleDraftBar
            key={`${article.id}-${article.cap_nhat_luc}`}
            article={article}
            persistEnabled={draftPersistEnabled}
          />
        </NgheArticleDraftProvider>
      ) : (
        <NgheLayoutStatic
          leadSource={leadSource}
          leadVideoUrl={leadVideoUrl}
          lienQuan={lienQuan}
          entityTaggedUsers={entityTaggedUsers}
          entityMilestones={entityMilestones}
          entitySort={entitySort}
          viewerProfileId={viewerProfileId}
          rolePeople={rolePeople}
          heroThumbnailUrl={heroThumbnailUrl}
          {...entityTabProps}
          heroTitle={article.tieu_de}
          heroEmLine={
            article.tieu_de_viet?.trim() ||
            article.tieu_de_eng?.trim() ||
            null
          }
          heroSummary={article.tom_tat}
          heroLinhVucLabel={article.linh_vuc?.ten?.trim() ?? null}
          heroAttribution={heroAttribution}
        />
      )}
    </div>
  );
}
