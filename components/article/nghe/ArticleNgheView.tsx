import type { ArticleBaiViet, ArticleCard } from "@/lib/articles/types";
import { buildNgheLeadSourceFromNoiDung } from "@/lib/articles/nghe-lead-source-build";
import type { RelatedJobLienQuanRow } from "@/lib/articles/related-jobs-dynamic";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";
import { getVideoUrlFromArticleMeta } from "@/lib/articles/lead-video-url";
import { resolveArticleThumbnailOnlySync } from "@/lib/bai-viet/thumbnail";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
import { NgheArticleDraftProvider } from "@/components/article/nghe/NgheArticleDraftContext";
import { NgheHeroLeadInlineDraft } from "@/components/article/nghe/NgheHeroLeadInlineDraft";
import { NgheLayoutStatic } from "@/components/article/nghe/static/NgheLayoutStatic";
import { ngheNghiepDetailHref } from "@/lib/cins/hubPaths";

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
};

export function ArticleNgheView({
  article,
  lienQuan = [],
  relatedJobsLienQuan = [],
  showDraftBar = false,
  draftPersistEnabled = false,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
}: ArticleNgheViewProps) {
  const slugPath = ngheNghiepDetailHref(article.slug);
  const leadSource = buildNgheLeadSourceFromNoiDung(
    article.noi_dung ?? article.noi_dung_markdown,
    relatedJobsLienQuan,
  );
  const leadVideoUrl = getVideoUrlFromArticleMeta(article.meta);
  const heroThumbnailUrl = resolveArticleThumbnailOnlySync(article.thumbnail);

  return (
    <div className="article-page arv2 arv2-nghe">
      <ArticleJsonLd article={article} slugPath={slugPath} />
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
            heroThumbnailUrl={heroThumbnailUrl}
            heroLeadBlock={
              <NgheHeroLeadInlineDraft
                leadVideoUrl={leadVideoUrl}
                heroThumbnailUrl={heroThumbnailUrl}
              />
            }
          />
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
          heroThumbnailUrl={heroThumbnailUrl}
          heroTitle={article.tieu_de}
          heroEmLine={
            article.tieu_de_viet?.trim() ||
            article.tieu_de_eng?.trim() ||
            null
          }
          heroSummary={article.tom_tat}
          heroLinhVucLabel={article.linh_vuc?.ten?.trim() ?? null}
        />
      )}
    </div>
  );
}
