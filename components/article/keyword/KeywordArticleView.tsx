import Link from "next/link";

import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
import {
  buildKeywordSidebarTabs,
  keywordDefaultSidebarTab,
} from "@/components/article/keyword/buildKeywordSidebarTabs";
import { KeywordCoverHero } from "@/components/article/keyword/KeywordCoverHero";
import { KeywordNganhSection } from "@/components/article/keyword/KeywordNganhSection";
import { KeywordRelatedBlogs } from "@/components/article/keyword/KeywordRelatedBlogs";
import { KeywordSummaryCard } from "@/components/article/keyword/KeywordSummaryCard";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheSidebarTabs } from "@/components/article/nghe/NgheSidebarTabs";
import { TacPhamSection } from "@/components/article/TacPhamSection";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { buildBaiVietHubUrl } from "@/lib/bai-viet/hub-loai";
import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import { articlePublicHref } from "@/lib/articles/article-href";
import { fetchRecentTacPhamGallery } from "@/lib/articles/queries";
import { resolveArticleVideoUrl } from "@/lib/articles/lead-video-url";
import { partitionKeywordRelated } from "@/lib/articles/partition-keyword-related";
import type {
  ArticleBaiViet,
  ArticleCard,
  TacPhamGalleryItem,
} from "@/lib/articles/types";

function splitTitleEm(title: string): { main: string; em: string | null } {
  const idx = title.indexOf(" | ");
  if (idx === -1) return { main: title, em: null };
  return {
    main: title.slice(0, idx).trim(),
    em: title.slice(idx + 3).trim() || null,
  };
}

function summaryHeadline(titleMain: string, displayEm: string | null): string {
  if (displayEm) {
    return `Hiểu sâu hơn về ${displayEm.toLowerCase()}`;
  }
  return `Hiểu sâu hơn về ${titleMain}`;
}

type Props = {
  article: ArticleBaiViet;
  lienQuan: ArticleCard[];
  tacPham: TacPhamGalleryItem[];
  draftUiEnabled?: boolean;
  draftPersistEnabled?: boolean;
};

export async function KeywordArticleView({
  article,
  lienQuan,
  tacPham,
  draftUiEnabled = false,
  draftPersistEnabled = false,
}: Props) {
  const slugPath = articlePublicHref("keyword", article.slug);
  const leadSource = buildArticleLeadSource(
    article.noi_dung ?? article.noi_dung_markdown,
  );
  const leadVideoUrl = resolveArticleVideoUrl(article);
  const { thumb_url: coverUrl } = await resolveHubArticleImages({
    thumbnail: article.thumbnail,
    cover_id: article.cover_id,
  });
  const { main: titleMain, em: titleEm } = splitTitleEm(article.tieu_de.trim());
  const displayEm =
    titleEm ||
    article.tieu_de_viet?.trim() ||
    article.tieu_de_eng?.trim() ||
    null;

  const { nghe, phanMem, keywords, nganh, blogs, other } =
    partitionKeywordRelated(lienQuan);
  const sidebarTabs = buildKeywordSidebarTabs(nghe, phanMem, keywords);
  const galleryItems =
    tacPham.length > 0 ? tacPham : await fetchRecentTacPhamGallery(6);
  const summaryText = article.tom_tat?.trim() || null;

  return (
    <div className="article-page arv2 arv2-nghe arv2-keyword">
      <ArticleJsonLd article={article} slugPath={slugPath} />

      <KeywordCoverHero
        title={titleMain}
        coverId={article.cover_id}
        coverUrl={coverUrl}
        slug={article.slug}
      />

      <div className="article-wrap article-wrap--nghe-first-draft">
        <main className="article-main">
          <div className="article-grid kw-article-grid">
            <nav className="kw-breadcrumb" aria-label="Breadcrumb">
              <Link href="/bai-viet">Khám phá</Link>
              <span aria-hidden>›</span>
              <Link href={buildBaiVietHubUrl({ loai: "keyword" })}>
                Keyword
              </Link>
              <span aria-hidden>›</span>
              <span>{titleMain}</span>
            </nav>

            <div className="nghe-main-sidebar-row kw-main-sidebar-row">
              <div className="nghe-grid-primary">
                <KeywordSummaryCard
                  headline={summaryHeadline(titleMain, displayEm)}
                  summary={summaryText}
                  videoUrl={leadVideoUrl}
                  selfSlug={article.slug}
                  selfTitle={titleMain}
                  selfTitleVi={article.tieu_de_viet}
                  relatedKeywords={keywords}
                />

                <div className="nghe-lead-panel" data-rich-lead-slot="true">
                  {leadSource ? (
                    <NgheLeadRich
                      html={leadSource}
                      excludeSlug={article.slug}
                    />
                  ) : (
                    <p className="nghe-side-empty">
                      Nội dung keyword đang được cập nhật.
                    </p>
                  )}
                </div>

                <section
                  className="nghe-grid-span"
                  aria-label="Nội dung bổ sung"
                >
                  <KeywordNganhSection nganh={nganh} sectionNum={1} />
                  <TacPhamSection
                    items={galleryItems}
                    showCommunityFallback={galleryItems.length === 0}
                    viewAllHref="/bai-viet"
                  />
                  <KeywordRelatedBlogs
                    blogs={[...blogs, ...other]}
                    sectionNum={nganh.length > 0 ? 2 : 1}
                  />
                </section>
              </div>

              <aside className="article-side" aria-label="Liên quan">
                {sidebarTabs.length > 0 ? (
                  <NgheSidebarTabs
                    tabs={sidebarTabs}
                    defaultTabId={keywordDefaultSidebarTab(
                      nghe,
                      phanMem,
                      keywords,
                    )}
                  />
                ) : (
                  <p className="nghe-side-empty">Chưa có mục liên quan.</p>
                )}
              </aside>
            </div>
          </div>
        </main>
      </div>

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
