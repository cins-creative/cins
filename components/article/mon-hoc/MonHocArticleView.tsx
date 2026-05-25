import Image from "next/image";
import Link from "next/link";

import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
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
import { TacPhamSection } from "@/components/article/TacPhamSection";
import { resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { buildArticleLeadSource } from "@/lib/articles/article-lead-source";
import { fetchRecentTacPhamGallery } from "@/lib/articles/queries";
import { getVideoUrlFromArticleMeta } from "@/lib/articles/lead-video-url";
import { relGradient, relInitials, partitionNgheRelated } from "@/lib/articles/rel-visual";
import type {
  ArticleBaiViet,
  ArticleCard,
  TacPhamGalleryItem,
} from "@/lib/articles/types";

function formatCapNhat(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function splitTitleEm(title: string): { main: string; em: string | null } {
  const idx = title.indexOf(" | ");
  if (idx === -1) return { main: title, em: null };
  return {
    main: title.slice(0, idx).trim(),
    em: title.slice(idx + 3).trim() || null,
  };
}

type Props = {
  article: ArticleBaiViet;
  lienQuan: ArticleCard[];
  tacPham: TacPhamGalleryItem[];
  draftUiEnabled?: boolean;
  draftPersistEnabled?: boolean;
};

export async function MonHocArticleView({
  article,
  lienQuan,
  tacPham,
  draftUiEnabled = false,
  draftPersistEnabled = false,
}: Props) {
  const slugPath = `/bai-viet/${article.slug}`;
  const leadSource = buildArticleLeadSource(
    article.noi_dung ?? article.noi_dung_markdown,
  );
  const leadVideoUrl = getVideoUrlFromArticleMeta(article.meta);
  const { thumb_url: heroThumb } = await resolveHubArticleImages({
    thumbnail: article.thumbnail,
    cover_id: article.cover_id,
  });
  const { main: titleMain, em: titleEm } = splitTitleEm(article.tieu_de.trim());
  const displayEm =
    titleEm ||
    article.tieu_de_viet?.trim() ||
    article.tieu_de_eng?.trim() ||
    null;
  const linhVuc = article.linh_vuc?.ten?.trim();
  const sidebarTabs = buildMonHocSidebarTabs(lienQuan, article.id);
  const monCourses = pickMonHocCourseCards(lienQuan, article.id);
  const { nghe, phanMem } = partitionNgheRelated(lienQuan);
  const relatedSectionStart = 1;
  const galleryItems =
    tacPham.length > 0 ? tacPham : await fetchRecentTacPhamGallery(6);

  return (
    <div className="article-page arv2 arv2-nghe arv2-mon-hoc">
      <ArticleJsonLd article={article} slugPath={slugPath} />
      <div className="article-wrap article-wrap--nghe-first-draft">
        <main className="article-main">
          <div className="article-grid">
            <div className="nghe-main-sidebar-row">
              <div className="nghe-grid-primary">
                <div className="nghe-hero-panel">
                  <div className="l1-hero">
                    <h1 className="h-disp nghe-hero-title">
                      {titleMain}
                      {displayEm ? (
                        <>
                          <br />
                          <em className="tieu_de_viet">{displayEm}</em>
                        </>
                      ) : null}
                    </h1>
                    <div className="nghe-hero-row">
                      <div className="nghe-hero-copy">
                        <span className="kicker k-monhoc">
                          {linhVuc ? `Môn học · ${linhVuc}` : "Môn học"}
                        </span>
                        {article.tom_tat?.trim() ? (
                          <p className="h-summary">{article.tom_tat.trim()}</p>
                        ) : null}
                      </div>
                      <div
                        className={`mascot${heroThumb ? " mascot--has-img" : ""}`}
                      >
                        {heroThumb ? (
                          <Image
                            src={heroThumb}
                            alt=""
                            width={220}
                            height={165}
                            className="arv2-mascot-img"
                            priority
                            unoptimized
                          />
                        ) : (
                          <span
                            className="mascot-ph"
                            style={{
                              background: relGradient(
                                article.slug || article.id,
                              ),
                            }}
                            aria-hidden
                          >
                            {relInitials(article.tieu_de)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-meta">
                      <span>
                        {article.luot_xem.toLocaleString("vi-VN")} lượt xem
                      </span>
                      <span>
                        Cập nhật {formatCapNhat(article.cap_nhat_luc)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="nghe-lead-panel" data-rich-lead-slot="true">
                  {leadVideoUrl ? <NgheLeadVideo url={leadVideoUrl} /> : null}
                  {leadSource ? (
                    <NgheLeadRich html={leadSource} />
                  ) : (
                    <p className="nghe-side-empty" style={{ padding: "20px" }}>
                      Nội dung bài viết đang được cập nhật.
                    </p>
                  )}
                </div>
              </div>

              <aside className="article-side">
                <NgheSidebarTabs
                  tabs={sidebarTabs}
                  defaultTabId={monHocDefaultSidebarTab(lienQuan, article.id)}
                />
                <div className="side-card side-card-quiz">
                  <h4 className="side-card-quiz-title">
                    Khám phá lộ trình học
                  </h4>
                  <p className="side-card-quiz-text">
                    Xem thêm môn học, ngành đào tạo và nghề nghiệp liên quan
                    trên CINs.
                  </p>
                  <Link href="/bai-viet" className="tb-cta nghe-quiz-cta">
                    Mở thư viện bài viết →
                  </Link>
                </div>
              </aside>
            </div>

            <section
              className="nghe-grid-span"
              aria-label="Tiếp theo trong bài viết"
            >
              <MonHocCoursesSection courses={monCourses} />
              <NgheRelatedSections
                ngheJobs={nghe}
                phanMem={phanMem}
                parsedSectionCount={relatedSectionStart}
                parsedTitles={[]}
              />
              <TacPhamSection
                items={galleryItems}
                showCommunityFallback={galleryItems.length === 0}
              />
            </section>
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
