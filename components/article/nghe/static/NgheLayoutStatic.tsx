import type { ReactNode } from "react";

import type { ArticleCard } from "@/lib/articles/types";
import { NgheHeroMascot } from "@/components/article/nghe/NgheHeroMascot";
import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";
import { NgheArticleToc } from "@/components/article/nghe/NgheArticleToc";
import { NgheTaggedWorksSection } from "@/components/article/nghe/NgheTaggedWorksSection";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  NGHE_COURSE_CARDS,
  NGHE_JOB_CARDS,
  NGHE_LEAD_BODY_HTML,
  NGHE_LEAD_HTML,
  NGHE_SW_TILES,
} from "@/components/article/nghe/static/nghe-static-data";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";
import {
  NgheRelCard,
  NgheRelItem,
  NgheRelTile,
} from "@/components/article/nghe/NgheRelParts";
import {
  StaticRelCard,
  StaticRelTile,
} from "@/components/article/nghe/static/NgheStaticParts";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import {
  NgheSidebarTabs,
  type NgheSidebarTabConfig,
} from "@/components/article/nghe/NgheSidebarTabs";

const NGHE_HERO_TITLE_FALLBACK = "3D Modeller";

type NgheLayoutStaticProps = {
  /**
   * `article_bai_viet.noi_dung` / `noi_dung_markdown` — HTML hoặc markdown cho `.nghe-lead-rich`.
   * Rỗng → giữ bản mẫu tĩnh `NGHE_LEAD_HTML`.
   */
  leadSource?: string | null;
  /**
   * Bài đích từ `article_lien_quan` (resolve trong `fetchRelatedArticles`).
   * · Lưới công việc: chỉ `loai_bai_viet = nghe`.
   * · Hàng phần mềm: chỉ `loai_bai_viet = phan_mem`.
   * · Tab sidebar «Kỹ thuật»: chỉ `loai_bai_viet = keyword`.
   * · Mục «Các khóa học liên quan»: chỉ `loai_bai_viet = mon_hoc`.
   */
  lienQuan?: ArticleCard[];
  /** `article_bai_viet.tieu_de` — hero H1 (dòng chính). */
  heroTitle?: string | null;
  /**
   * Dòng trong `<em>` dưới H1: ưu tiên `tieu_de_viet`, không có thì `tieu_de_eng`.
   */
  heroEmLine?: string | null;
  /** `article_bai_viet.tom_tat` — đoạn `.h-summary`. */
  heroSummary?: string | null;
  /** Lĩnh vực từ `article_bai_viet.id_linh_vuc` — badge đầu hero. */
  heroLinhVucLabel?: string | null;
  /** `article_bai_viet.meta.video_url` — video/embed đặt trước nội dung lead. */
  leadVideoUrl?: string | null;
  /** `article_bai_viet.thumbnail` — ô mascot hero (4:3). */
  heroThumbnailUrl?: string | null;
  /** Nút công cụ draft trong hero (chỉ khi bật chế độ thử). */
  heroDraftTools?: ReactNode;
  /**
   * Khi có (chế độ draft nghề) — thay cả khối hero + `.nghe-lead-panel` bằng nội dung client
   * (sửa tại chỗ). Các prop hero/lead phía trên bị bỏ qua cho khối này.
   */
  heroLeadBlock?: ReactNode;
  /** Người dùng đã gắn tag bài nghề. */
  entityTaggedUsers?: TagAggUser[];
  /** Cột mốc/tác phẩm gắn tag — timeline hoặc lưới. */
  entityMilestones?: ReadonlyArray<MilestoneItem>;
  entitySort?: TagAggSort;
  viewerProfileId?: string | null;
};

/** Khung tĩnh — bám sát OpenDesign `first-draft-layout-nghe.html`; khối lead map DB khi có `leadSource`. */
export function NgheLayoutStatic({
  leadSource,
  lienQuan = [],
  heroTitle,
  heroEmLine,
  heroSummary,
  heroLinhVucLabel,
  leadVideoUrl,
  heroThumbnailUrl,
  heroDraftTools,
  heroLeadBlock,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
}: NgheLayoutStaticProps = {}) {
  const leadTrim = leadSource?.trim() ?? "";
  const leadVid = leadVideoUrl?.trim() ?? "";
  const displayTitle =
    (heroTitle ?? "").trim() || NGHE_HERO_TITLE_FALLBACK;
  const displayEmLine = (heroEmLine ?? "").trim();
  const displaySummary = (heroSummary ?? "").trim();
  const displayLinhVuc = (heroLinhVucLabel ?? "").trim();
  const ngheLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "nghe",
  );
  const useDbJobCards = ngheLienQuan.length > 0;
  const phanMemLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "phan_mem",
  );
  const useDbSwTiles = phanMemLienQuan.length > 0;
  const keywordLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "keyword",
  );
  const useDbKeywords = keywordLienQuan.length > 0;
  const nganhLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "nganh_dao_tao",
  );
  const useDbNganh = nganhLienQuan.length > 0;
  const monHocLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "mon_hoc",
  );
  const useDbCourseCards = monHocLienQuan.length > 0;

  const sidebarTabs: NgheSidebarTabConfig[] = [];
  if (useDbNganh) {
    sidebarTabs.push({
      id: "nganh",
      label: "Ngành học",
      header: (
        <div className="rel-header">
          <h4>Ngành học vào nghề</h4>
        </div>
      ),
      body: (
        <div className="rel-list">
          {nganhLienQuan.map((card, i) => (
            <NgheRelItem
              key={card.id}
              card={card}
              tipClass={i % 2 === 0 ? "tip-left" : "tip-right"}
              showTag={false}
              showSummary={false}
            />
          ))}
        </div>
      ),
    });
  }
  if (useDbKeywords) {
    sidebarTabs.push({
      id: "keyword",
      label: "Kỹ thuật",
      header: (
        <div className="rel-header">
          <h4>
            Keyword liên quan{" "}
            <em>{`${keywordLienQuan.length} kỹ thuật`}</em>
          </h4>
          <span className="hint">Hover để xem mô tả</span>
        </div>
      ),
      body: (
        <div className="rel-list">
          {keywordLienQuan.map((card, i) => (
            <NgheRelItem
              key={card.id}
              card={card}
              tipClass={i % 2 === 0 ? "tip-left" : "tip-right"}
              showTag={false}
              showSummary={false}
            />
          ))}
        </div>
      ),
    });
  }
  if (useDbJobCards) {
    sidebarTabs.push({
      id: "nghe",
      label: "Nghề liên quan",
      header: (
        <div className="rel-header">
          <h4>
            Nghề liên quan <em>cùng pipeline</em>
          </h4>
          <span className="hint">Hover để xem thu nhập &amp; mảng việc</span>
        </div>
      ),
      body: (
        <div className="rel-list">
          {ngheLienQuan.map((card, i) => (
            <NgheRelItem
              key={card.id}
              card={card}
              tipClass={i % 2 === 0 ? "tip-left" : "tip-right"}
              showTag={false}
              showSummary={false}
            />
          ))}
        </div>
      ),
    });
  }
  return (
    <div className="article-wrap article-wrap--nghe-first-draft">
      <main className="article-main">
        <div className="article-grid">
        <div className="nghe-article-body">
        <div className="nghe-article-layout">
        <NgheArticleToc />
        <div className="nghe-article-main">
        <div className="nghe-main-sidebar-row">
        <div className="nghe-grid-primary">
          {heroLeadBlock ? (
            heroLeadBlock
          ) : (
            <>
              <div
                className="nghe-hero-panel"
                id="nghe-sec-intro"
                data-rich-hero-slot="true"
              >
                <div className="l1-hero">
                  {heroDraftTools}
                  <h1 className="h-disp nghe-hero-title">
                    {displayTitle}
                    {displayEmLine ? (
                      <>
                        <br />
                        <em className="tieu_de_viet" data-hero-line="subtitle">
                          {displayEmLine}
                        </em>
                      </>
                    ) : null}
                  </h1>
                  <div className="nghe-hero-row">
                    <div className="nghe-hero-copy">
                      <span className="kicker k-nghe">
                        {displayLinhVuc
                          ? `Nghề nghiệp · ${displayLinhVuc}`
                          : "Nghề nghiệp"}
                      </span>
                      {displaySummary ? (
                        <p className="h-summary">{displaySummary}</p>
                      ) : null}
                    </div>
                    <NgheHeroMascot
                      thumbnailUrl={heroThumbnailUrl}
                      title={displayTitle}
                    />
                  </div>
                </div>
              </div>

              <div className="nghe-lead-panel" data-rich-lead-slot="true">
                {leadVid ? <NgheLeadVideo url={leadVid} /> : null}
                {leadTrim ? (
                  <NgheLeadRich html={leadTrim} />
                ) : (
                  <div
                    className="nghe-lead-rich article-rich-content article-content-html"
                    dangerouslySetInnerHTML={{
                      __html: imagedeliveryPreferPublicInHtml(
                        leadVid ? NGHE_LEAD_BODY_HTML : NGHE_LEAD_HTML,
                      ),
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <aside className="article-side">
          {sidebarTabs.length > 0 ? (
            <NgheSidebarTabs tabs={sidebarTabs} defaultTabId="nganh" />
          ) : null}

          <div className="side-card side-card-quiz">
            <h4 className="side-card-quiz-title">
              Bạn phù hợp với nghề này?
            </h4>
            <p className="side-card-quiz-text">
              Làm bài quiz 3 phút để biết tỷ lệ phù hợp của bạn với 3D
              Modeller.
            </p>
            <button type="button" className="tb-cta nghe-quiz-cta">
              Làm quiz miễn phí →
            </button>
          </div>
        </aside>
        </div>

        <section className="nghe-grid-span" aria-label="Tiếp theo trong bài viết">
          <h2 className="section-h" id="nghe-sec-jobs">
            <span className="num">03</span>
            Vị trí công việc liên quan
          </h2>
          <div className="job-grid">
            {useDbJobCards
              ? ngheLienQuan.map((card, i) => (
                  <NgheRelCard
                    key={card.id}
                    card={card}
                    tipClass={i % 3 === 2 ? "tip-right" : "tip-left"}
                  />
                ))
              : NGHE_JOB_CARDS.map((card) => (
                  <StaticRelCard key={card.name} item={card} />
                ))}
          </div>

          <h2 className="section-h" id="nghe-sec-software">
            <span className="num">04</span>
            Phần mềm sử dụng
          </h2>
          <div className="sw-row">
            {useDbSwTiles
              ? phanMemLienQuan.map((card, i) => (
                  <NgheRelTile
                    key={card.id}
                    card={card}
                    tipClass={i % 3 === 2 ? "tip-right" : "tip-left"}
                  />
                ))
              : NGHE_SW_TILES.map((tile) => (
                  <StaticRelTile key={tile.name} item={tile} />
                ))}
          </div>

          <h2 className="section-h" id="nghe-sec-courses">
            <span className="num">05</span>
            Các khóa học liên quan
          </h2>
          <div className="job-grid">
            {useDbCourseCards
              ? monHocLienQuan.map((card, i) => (
                  <NgheRelCard
                    key={card.id}
                    card={card}
                    tipClass={i % 3 === 2 ? "tip-right" : "tip-left"}
                  />
                ))
              : NGHE_COURSE_CARDS.map((card) => (
                  <StaticRelCard key={card.name} item={card} />
                ))}
          </div>

          <NgheTaggedWorksSection
            users={entityTaggedUsers}
            milestones={entityMilestones}
            sort={entitySort}
            viewerProfileId={viewerProfileId}
          />
        </section>
        </div>
        </div>
        </div>
        </div>
      </main>
    </div>
  );
}
