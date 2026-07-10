import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { EntityArticleDiscussion } from "@/components/article/entity/EntityArticleDiscussion";
import { EntityArticleHeader } from "@/components/article/entity/EntityArticleHeader";
import { EntityArticleLayout } from "@/components/article/entity/EntityArticleLayout";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { NgheSidebarTabs } from "@/components/article/nghe/NgheSidebarTabs";
import {
  buildSoftwareSidebarTabs,
  softwareDefaultSidebarTab,
} from "@/components/article/software/buildSoftwareSidebarTabs";
import { SoftwareCompareTable } from "@/components/article/software/SoftwareCompareTable";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import { articlePublicHref } from "@/lib/articles/article-href";
import { linkKeywordsInContent } from "@/lib/articles/link-keywords-in-content";
import { resolveArticleVideoUrl } from "@/lib/articles/lead-video-url";
import { isMetaPhanMem } from "@/lib/articles/meta-phan-mem";
import { partitionSoftwareRelated } from "@/lib/articles/partition-software-related";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { ArticleBaiViet, ArticleCard } from "@/lib/articles/types";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";

async function enrichCardsWithThumbs(
  cards: ArticleCard[],
): Promise<ArticleCard[]> {
  return Promise.all(
    cards.map(async (card) => {
      const { thumb_url } = await resolveHubArticleImages({
        thumbnail: card.thumbnail,
        cover_id: card.cover_id,
      });
      return { ...card, thumb_url };
    }),
  );
}

type Props = {
  article: ArticleBaiViet;
  lienQuan: ArticleCard[];
  entityTaggedUsers?: TagAggUser[];
  entityMilestones?: ReadonlyArray<MilestoneItem>;
  entitySort?: TagAggSort;
  viewerProfileId?: string | null;
};

export async function SoftwareEntityArticleView({
  article,
  lienQuan,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
}: Props) {
  const slugPath = articlePublicHref("phan_mem", article.slug);
  const leadSource = buildArticleLeadSource(
    article.noi_dung ?? article.noi_dung_markdown,
  );
  const linkedLeadHtml = leadSource
    ? await linkKeywordsInContent(leadSource)
    : null;
  const leadVideoUrl = resolveArticleVideoUrl(article);
  const { thumb_url: iconUrl } = await resolveHubArticleImages({
    thumbnail: article.thumbnail,
    cover_id: article.cover_id,
  });
  const meta = isMetaPhanMem(article.meta) ? article.meta : null;
  const verified = article.da_verify === true;
  const publisher = meta?.nha_phat_hanh?.trim() || null;

  const { nghe, keywords, similar } = partitionSoftwareRelated(lienQuan);
  const comparePeers = await enrichCardsWithThumbs(
    similar.filter((p) => p.id !== article.id),
  );
  const sidebarTabs = buildSoftwareSidebarTabs(nghe, keywords, similar);
  const titleMain = article.tieu_de.trim();

  const content = (
    <div className="nghe-lead-panel entity-lead-panel" data-rich-lead-slot="true">
      {leadVideoUrl ? <NgheLeadVideo url={leadVideoUrl} /> : null}
      {linkedLeadHtml ? (
        <NgheLeadRich html={linkedLeadHtml} />
      ) : (
        <p className="nghe-side-empty ent-empty-lead">
          Nội dung phần mềm đang được cập nhật.
        </p>
      )}
    </div>
  );

  const contentExtra =
    comparePeers.length > 0 ? (
      <SoftwareCompareTable
        current={article}
        peers={comparePeers}
        sectionNum={1}
      />
    ) : null;

  const sidebar = (
    <>
      {sidebarTabs.length > 0 ? (
        <NgheSidebarTabs
          tabs={sidebarTabs}
          defaultTabId={softwareDefaultSidebarTab(nghe, keywords, similar)}
        />
      ) : (
        <p className="nghe-side-empty">Chưa có mục liên quan.</p>
      )}

      {publisher ? (
        <div className="ent-side-meta">
          <h4 className="ent-side-meta-title">Nhà phát hành</h4>
          <p className="ent-side-meta-value">{publisher}</p>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="article-page arv2 arv2-nghe arv2-software">
      <ArticleJsonLd article={article} slugPath={slugPath} />
      <EntityArticleLayout
        pageClassName="ent-page--software"
        header={
          <EntityArticleHeader
            kind="phan_mem"
            title={titleMain}
            emLine={article.tieu_de_viet ?? article.tieu_de_eng}
            summary={article.tom_tat}
            thumbnailUrl={iconUrl}
            verified={verified}
          />
        }
        content={content}
        contentExtra={contentExtra}
        discussion={
          <EntityArticleDiscussion
            users={entityTaggedUsers}
            milestones={entityMilestones}
            sort={entitySort}
            viewerProfileId={viewerProfileId}
          />
        }
        sidebar={sidebar}
      />
    </div>
  );
}
