import { ContributionTabPanel } from "@/components/article/contribution/ContributionTabPanel";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
import { EntityArticleDiscussion } from "@/components/article/entity/EntityArticleDiscussion";
import { EntityArticleHeader } from "@/components/article/entity/EntityArticleHeader";
import { EntityArticleLayout } from "@/components/article/entity/EntityArticleLayout";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { NgheRelatedSections } from "@/components/article/nghe/NgheRelatedSections";
import { NgheSidebarTabs } from "@/components/article/nghe/NgheSidebarTabs";
import {
  buildMonHocSidebarTabs,
  monHocDefaultSidebarTab,
  pickMonHocCourseCards,
} from "@/components/article/mon-hoc/buildMonHocSidebarTabs";
import { MonHocCoursesSection } from "@/components/article/mon-hoc/MonHocCoursesSection";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import {
  entityCanonicalLeadHtml,
  hasEntityCanonicalContent,
} from "@/lib/article/dong-gop/canonical-content";
import { listDongGopForEntityTab } from "@/lib/article/dong-gop/public-list";
import { fetchRecentTacPhamGallery } from "@/lib/articles/queries";
import { getVideoUrlFromArticleMeta } from "@/lib/articles/lead-video-url";
import { partitionNgheRelated } from "@/lib/articles/rel-visual";
import { splitArticleTitleEm } from "@/lib/articles/split-title-em";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type {
  ArticleBaiViet,
  ArticleCard,
  TacPhamGalleryItem,
} from "@/lib/articles/types";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";

type Props = {
  article: ArticleBaiViet;
  lienQuan: ArticleCard[];
  tacPham: TacPhamGalleryItem[];
  entityTaggedUsers?: TagAggUser[];
  entityMilestones?: ReadonlyArray<MilestoneItem>;
  entitySort?: TagAggSort;
  viewerProfileId?: string | null;
  draftUiEnabled?: boolean;
  draftPersistEnabled?: boolean;
};

export async function MonHocArticleView({
  article,
  lienQuan,
  tacPham,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
  draftUiEnabled = false,
  draftPersistEnabled = false,
}: Props) {
  const slugPath = `/bai-viet/${article.slug}`;
  const leadSource = buildArticleLeadSource(
    entityCanonicalLeadHtml(article.noi_dung) ?? article.noi_dung_markdown,
  );
  const leadVideoUrl = getVideoUrlFromArticleMeta(article.meta);
  const { thumb_url: heroThumb } = await resolveHubArticleImages({
    thumbnail: article.thumbnail,
    cover_id: article.cover_id,
  });
  const { main: titleMain, em: titleEm } = splitArticleTitleEm(
    article.tieu_de.trim(),
  );
  const displayEm =
    titleEm ||
    article.tieu_de_viet?.trim() ||
    article.tieu_de_eng?.trim() ||
    null;
  const linhVuc = article.linh_vuc?.ten?.trim();
  const sidebarTabs = buildMonHocSidebarTabs(lienQuan, article.id);
  const monCourses = pickMonHocCourseCards(lienQuan, article.id);
  const { nghe, phanMem } = partitionNgheRelated(lienQuan);
  const galleryItems =
    tacPham.length > 0 ? tacPham : await fetchRecentTacPhamGallery(6);

  const canonicalEmpty = !hasEntityCanonicalContent(article.noi_dung);
  const isLoggedIn = viewerProfileId != null;
  const contributionData = await listDongGopForEntityTab(
    article.id,
    viewerProfileId,
    {
      loaiBaiViet: "mon_hoc",
      entityTitle: article.tieu_de,
      entitySeed: {
        tieu_de: titleMain,
        tieu_de_viet: article.tieu_de_viet ?? "",
        tieu_de_eng: article.tieu_de_eng ?? "",
        tom_tat: article.tom_tat ?? "",
        video_url: leadVideoUrl ?? "",
        thumbnail: article.thumbnail ?? "",
      },
    },
  );

  const content = (
    <div className="nghe-lead-panel entity-lead-panel" data-rich-lead-slot="true">
      {leadVideoUrl ? <NgheLeadVideo url={leadVideoUrl} /> : null}
      {leadSource ? (
        <NgheLeadRich html={leadSource} />
      ) : (
        <p className="nghe-side-empty ent-empty-lead">
          Nội dung bài viết đang được cập nhật.
        </p>
      )}
    </div>
  );

  const contentExtra = (
    <>
      <MonHocCoursesSection courses={monCourses} />
      <NgheRelatedSections
        ngheJobs={nghe}
        phanMem={phanMem}
        parsedSectionCount={1}
        parsedTitles={[]}
      />
    </>
  );

  const sidebar = (
    <>
      <NgheSidebarTabs
        tabs={sidebarTabs}
        defaultTabId={monHocDefaultSidebarTab(lienQuan, article.id)}
      />
      <div className="side-card side-card-quiz">
        <h4 className="side-card-quiz-title">Khám phá lộ trình học</h4>
        <p className="side-card-quiz-text">
          Xem thêm môn học, ngành đào tạo và nghề nghiệp liên quan trên CINs.
        </p>
      </div>
    </>
  );

  return (
    <div className="article-page arv2 arv2-nghe arv2-mon-hoc">
      <ArticleJsonLd
        article={article}
        slugPath={slugPath}
        variant="learningResource"
      />
      <EntityArticleLayout
        pageClassName="ent-page--mon-hoc"
        header={
          <EntityArticleHeader
            kind="mon_hoc"
            title={titleMain}
            emLine={displayEm}
            summary={article.tom_tat}
            contextLabel={linhVuc}
            thumbnailUrl={heroThumb}
          />
        }
        content={content}
        contentExtra={contentExtra}
        contribution={
          <ContributionTabPanel
            items={contributionData.items}
            count={contributionData.count}
            isLoggedIn={isLoggedIn}
            viewerHasDraft={contributionData.viewerHasDraft}
            loginNext={slugPath}
            idBaiViet={article.id}
            articleTitle={article.tieu_de}
            loaiBaiViet="mon_hoc"
            viewerEditor={contributionData.viewerEditor}
          />
        }
        canonicalEmpty={canonicalEmpty}
        entityKindLabel="Môn học"
        isLoggedIn={isLoggedIn}
        loginNext={slugPath}
        discussion={
          <EntityArticleDiscussion
            users={entityTaggedUsers}
            milestones={entityMilestones}
            sort={entitySort}
            viewerProfileId={viewerProfileId}
            tacPham={galleryItems}
          />
        }
        sidebar={sidebar}
      />
      {draftUiEnabled ? (
        <InlineArticleDraftBar
          key={`${article.id}-${article.cap_nhat_luc}`}
          article={article}
          persistEnabled={draftPersistEnabled}
        />
      ) : null}
    </div>
  );
}
