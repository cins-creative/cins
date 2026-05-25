import Link from "next/link";

import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
import { SoftwareEditableLead } from "@/components/article/software/SoftwareEditableLead";
import { NgheSidebarTabs } from "@/components/article/nghe/NgheSidebarTabs";
import {
  buildSoftwareSidebarTabs,
  softwareDefaultSidebarTab,
} from "@/components/article/software/buildSoftwareSidebarTabs";
import { SoftwareCompareTable } from "@/components/article/software/SoftwareCompareTable";
import { SoftwareCoverHero } from "@/components/article/software/SoftwareCoverHero";
import { SoftwareSummaryCard } from "@/components/article/software/SoftwareSummaryCard";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { buildBaiVietHubUrl } from "@/lib/bai-viet/hub-loai";
import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import { articlePublicHref } from "@/lib/articles/article-href";
import { linkKeywordsInContent } from "@/lib/articles/link-keywords-in-content";
import { resolveArticleVideoUrl } from "@/lib/articles/lead-video-url";
import { isMetaPhanMem } from "@/lib/articles/meta-phan-mem";
import {
  partitionSoftwareRelated,
  pickMonHocCourses,
} from "@/lib/articles/partition-software-related";
import type { ArticleBaiViet, ArticleCard } from "@/lib/articles/types";

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
  /** Giữ cho `/bai-viet/[slug]` — toolbar quản trị dùng SoftwareArticlePageShell. */
  draftUiEnabled?: boolean;
  draftPersistEnabled?: boolean;
};

export async function SoftwareArticleView({
  article,
  lienQuan,
  draftUiEnabled = false,
  draftPersistEnabled = false,
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

  const { nghe, keywords, similar } = partitionSoftwareRelated(lienQuan);
  const monCourses = pickMonHocCourses(lienQuan);
  const comparePeers = await enrichCardsWithThumbs(
    similar.filter((p) => p.id !== article.id),
  );
  const sidebarTabs = buildSoftwareSidebarTabs(nghe, keywords, similar);
  const titleMain = article.tieu_de.trim();

  return (
    <div className="article-page arv2 arv2-nghe arv2-software">
      <ArticleJsonLd article={article} slugPath={slugPath} />

      <SoftwareCoverHero
        title={titleMain}
        slug={article.slug}
        videoUrl={leadVideoUrl}
        publisher={meta?.nha_phat_hanh ?? null}
      />

      <div className="article-wrap article-wrap--nghe-first-draft">
        <main className="article-main">
          <div className="article-grid sw-article-grid">
            <nav className="sw-breadcrumb" aria-label="Breadcrumb">
              <Link href="/bai-viet">Khám phá</Link>
              <span aria-hidden>›</span>
              <Link href={buildBaiVietHubUrl({ loai: "phan_mem" })}>
                Phần mềm
              </Link>
              <span aria-hidden>›</span>
              <span>{titleMain}</span>
            </nav>

            <div className="nghe-main-sidebar-row sw-main-sidebar-row">
              <div className="nghe-grid-primary">
                <SoftwareSummaryCard article={article} iconUrl={iconUrl} />

                <SoftwareEditableLead linkedLeadHtml={linkedLeadHtml} />

                <section
                  className="nghe-grid-span"
                  aria-label="So sánh và liên quan"
                >
                  <SoftwareCompareTable
                    current={article}
                    peers={comparePeers}
                    sectionNum={1}
                  />
                </section>
              </div>

              <aside className="article-side" aria-label="Liên quan">
                {sidebarTabs.length > 0 ? (
                  <NgheSidebarTabs
                    tabs={sidebarTabs}
                    defaultTabId={softwareDefaultSidebarTab(
                      nghe,
                      keywords,
                      similar,
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
