import { ContributionTabPanel } from "@/components/article/contribution/ContributionTabPanel";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { EntityArticleAttribution } from "@/components/article/entity/EntityArticleAttribution";
import { EntityArticleDiscussion } from "@/components/article/entity/EntityArticleDiscussion";
import { EntityArticleHeader } from "@/components/article/entity/EntityArticleHeader";
import { EntityArticleLayout } from "@/components/article/entity/EntityArticleLayout";
import {
  buildKeywordSidebarTabs,
  keywordDefaultSidebarTab,
} from "@/components/article/keyword/buildKeywordSidebarTabs";
import { KeywordNganhSection } from "@/components/article/keyword/KeywordNganhSection";
import { KeywordRelatedBlogs } from "@/components/article/keyword/KeywordRelatedBlogs";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { NgheSidebarTabs } from "@/components/article/nghe/NgheSidebarTabs";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import { articlePublicHref } from "@/lib/articles/article-href";
import { resolveArticleVideoUrl } from "@/lib/articles/lead-video-url";
import { partitionKeywordRelated } from "@/lib/articles/partition-keyword-related";
import { splitArticleTitleEm } from "@/lib/articles/split-title-em";
import {
  fetchArticleAttribution,
  mapAttributionForDisplay,
} from "@/lib/article/dong-gop/attribution";
import { hasEntityCanonicalContent, entityCanonicalLeadHtml } from "@/lib/article/dong-gop/canonical-content";
import { listDongGopForEntityTab } from "@/lib/article/dong-gop/public-list";
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
};

export async function KeywordEntityArticleView({
  article,
  lienQuan,
  tacPham,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
}: Props) {
  const slugPath = articlePublicHref("keyword", article.slug);
  const leadSource = buildArticleLeadSource(
    entityCanonicalLeadHtml(article.noi_dung) ?? article.noi_dung_markdown,
  );
  const leadVideoUrl = resolveArticleVideoUrl(article);
  const { thumb_url: thumbUrl } = await resolveHubArticleImages({
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
  const verified = article.da_verify === true;

  const attributionDisplay = mapAttributionForDisplay(
    await fetchArticleAttribution(article.id),
  );

  const canonicalEmpty = !hasEntityCanonicalContent(article.noi_dung);
  const isLoggedIn = viewerProfileId != null;
  const contributionData = await listDongGopForEntityTab(
    article.id,
    viewerProfileId,
    {
      loaiBaiViet: "keyword",
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

  const { nghe, phanMem, keywords, nganh, blogs, other } =
    partitionKeywordRelated(lienQuan);
  const sidebarTabs = buildKeywordSidebarTabs(nghe, phanMem, keywords);

  const content = (
    <div className="nghe-lead-panel entity-lead-panel" data-rich-lead-slot="true">
      {leadVideoUrl ? <NgheLeadVideo url={leadVideoUrl} /> : null}
      {leadSource ? (
        <NgheLeadRich html={leadSource} excludeSlug={article.slug} />
      ) : canonicalEmpty ? null : (
        <p className="nghe-side-empty entity-empty-lead">
          Nội dung keyword đang được cập nhật.
        </p>
      )}
    </div>
  );

  const hasExtra =
    nganh.length > 0 || blogs.length > 0 || other.length > 0;
  const contentExtra = hasExtra ? (
    <>
      <KeywordNganhSection nganh={nganh} sectionNum={1} />
      <KeywordRelatedBlogs
        blogs={[...blogs, ...other]}
        sectionNum={nganh.length > 0 ? 2 : 1}
      />
    </>
  ) : null;

  const sidebar = (
    <>
      {sidebarTabs.length > 0 ? (
        <NgheSidebarTabs
          tabs={sidebarTabs}
          defaultTabId={keywordDefaultSidebarTab(nghe, phanMem, keywords)}
        />
      ) : (
        <p className="nghe-side-empty">Chưa có mục liên quan.</p>
      )}
    </>
  );

  return (
    <div className="article-page arv2 arv2-nghe arv2-keyword">
      <ArticleJsonLd article={article} slugPath={slugPath} />
      <EntityArticleLayout
        pageClassName="ent-page--keyword"
        header={
          <EntityArticleHeader
            kind="keyword"
            title={titleMain}
            emLine={displayEm}
            summary={article.tom_tat}
            thumbnailUrl={thumbUrl}
            verified={verified}
            attribution={
              <EntityArticleAttribution data={attributionDisplay} />
            }
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
            loaiBaiViet="keyword"
            viewerEditor={contributionData.viewerEditor}
          />
        }
        canonicalEmpty={canonicalEmpty}
        entityKindLabel="Khái niệm"
        isLoggedIn={isLoggedIn}
        loginNext={slugPath}
        discussion={
          <EntityArticleDiscussion
            users={entityTaggedUsers}
            milestones={entityMilestones}
            sort={entitySort}
            viewerProfileId={viewerProfileId}
            tacPham={tacPham}
          />
        }
        sidebar={sidebar}
      />
    </div>
  );
}
