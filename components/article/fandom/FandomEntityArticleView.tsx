import { ContributionTabPanel } from "@/components/article/contribution/ContributionTabPanel";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { EntityArticleAttribution } from "@/components/article/entity/EntityArticleAttribution";
import { EntityArticleDiscussion } from "@/components/article/entity/EntityArticleDiscussion";
import { EntityArticleHeader } from "@/components/article/entity/EntityArticleHeader";
import { EntityArticleLayout } from "@/components/article/entity/EntityArticleLayout";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import { articlePublicHref } from "@/lib/articles/article-href";
import { resolveArticleVideoUrl } from "@/lib/articles/lead-video-url";
import { splitArticleTitleEm } from "@/lib/articles/split-title-em";
import {
  fetchArticleAttribution,
  mapAttributionForDisplay,
} from "@/lib/article/dong-gop/attribution";
import {
  hasEntityCanonicalContent,
  entityCanonicalLeadHtml,
} from "@/lib/article/dong-gop/canonical-content";
import { listDongGopForEntityTab } from "@/lib/article/dong-gop/public-list";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type {
  ArticleBaiViet,
  TacPhamGalleryItem,
} from "@/lib/articles/types";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";

type Props = {
  article: ArticleBaiViet;
  tacPham: TacPhamGalleryItem[];
  entityTaggedUsers?: TagAggUser[];
  entityMilestones?: ReadonlyArray<MilestoneItem>;
  entitySort?: TagAggSort;
  viewerProfileId?: string | null;
};

export async function FandomEntityArticleView({
  article,
  tacPham,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
}: Props) {
  const slugPath = articlePublicHref("fandom", article.slug);
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
  const verified = false;

  const attributionDisplay = mapAttributionForDisplay(
    await fetchArticleAttribution(article.id),
  );

  const canonicalEmpty = !hasEntityCanonicalContent(article.noi_dung);
  const isLoggedIn = viewerProfileId != null;
  const contributionData = await listDongGopForEntityTab(
    article.id,
    viewerProfileId,
    {
      loaiBaiViet: "fandom",
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
        <NgheLeadRich html={leadSource} excludeSlug={article.slug} />
      ) : canonicalEmpty ? null : (
        <p className="nghe-side-empty entity-empty-lead">
          Nội dung fandom đang được cập nhật.
        </p>
      )}
    </div>
  );

  return (
    <div className="article-page arv2 arv2-nghe arv2-fandom">
      <ArticleJsonLd article={article} slugPath={slugPath} />
      <EntityArticleLayout
        pageClassName="ent-page--fandom"
        defaultTab="discussion"
        header={
          <EntityArticleHeader
            kind="fandom"
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
        contribution={
          <ContributionTabPanel
            items={contributionData.items}
            count={contributionData.count}
            isLoggedIn={isLoggedIn}
            viewerHasDraft={contributionData.viewerHasDraft}
            loginNext={slugPath}
            idBaiViet={article.id}
            articleTitle={article.tieu_de}
            loaiBaiViet="fandom"
            viewerEditor={contributionData.viewerEditor}
          />
        }
        canonicalEmpty={canonicalEmpty}
        entityKindLabel="Phân loại"
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
      />
    </div>
  );
}
