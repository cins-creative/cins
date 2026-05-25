import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import type { ArticleCard } from "@/lib/articles/types";
import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";
import {
  NGHE_COURSE_CARDS,
  NGHE_GALLERY,
  NGHE_JOB_CARDS,
  NGHE_LEAD_BODY_HTML,
  NGHE_LEAD_HTML,
  NGHE_SIDEBAR_KEYWORDS,
  NGHE_SIDEBAR_NGANH,
  NGHE_SIDEBAR_NGHE,
  NGHE_SW_TILES,
} from "@/components/article/nghe/static/nghe-static-data";
import {
  NgheRelCard,
  NgheRelItem,
  NgheRelTile,
} from "@/components/article/nghe/NgheRelParts";
import {
  StaticRelCard,
  StaticRelItem,
  StaticRelTile,
} from "@/components/article/nghe/static/NgheStaticParts";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { NgheSidebarTabs } from "@/components/article/nghe/NgheSidebarTabs";

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    </svg>
  );
}

function IconCal() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconComment() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

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
  /** Nút công cụ draft trong hero (chỉ khi bật chế độ thử). */
  heroDraftTools?: ReactNode;
  /**
   * Khi có (chế độ draft nghề) — thay cả khối hero + `.nghe-lead-panel` bằng nội dung client
   * (sửa tại chỗ). Các prop hero/lead phía trên bị bỏ qua cho khối này.
   */
  heroLeadBlock?: ReactNode;
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
  heroDraftTools,
  heroLeadBlock,
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
  const monHocLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "mon_hoc",
  );
  const useDbCourseCards = monHocLienQuan.length > 0;
  return (
    <div className="article-wrap article-wrap--nghe-first-draft">
      <main className="article-main">
        <div className="article-grid">
        <div className="nghe-main-sidebar-row">
        <div className="nghe-grid-primary">
          {heroLeadBlock ? (
            heroLeadBlock
          ) : (
            <>
              <div className="nghe-hero-panel" data-rich-hero-slot="true">
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
                    <div className="mascot">
                      <Image
                        src="/assets/mascot-technical-artist.png"
                        alt={displayTitle}
                        width={280}
                        height={280}
                        className="arv2-mascot-img"
                      />
                    </div>
                  </div>
                  <div className="h-meta">
                    <span>
                      <IconEye />
                      980 lượt xem
                    </span>
                    <span>
                      <IconCal />
                      Cập nhật 14/05/2026
                    </span>
                    <span>
                      <IconComment />
                      23 bình luận
                    </span>
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
          <NgheSidebarTabs
            keyword={{
              header: (
                <div className="rel-header">
                  <h4>
                    Keyword liên quan{" "}
                    <em>
                      {useDbKeywords
                        ? `${keywordLienQuan.length} kỹ thuật`
                        : "6 kỹ thuật"}
                    </em>
                  </h4>
                  <span className="hint">Hover để xem mô tả</span>
                </div>
              ),
              body: (
                <div className="rel-list">
                  {useDbKeywords
                    ? keywordLienQuan.map((card, i) => (
                        <NgheRelItem
                          key={card.id}
                          card={card}
                          tipClass={i % 2 === 0 ? "tip-left" : "tip-right"}
                        />
                      ))
                    : NGHE_SIDEBAR_KEYWORDS.map((item) => (
                        <StaticRelItem key={item.name} item={item} />
                      ))}
                </div>
              ),
            }}
            nghe={{
              header: (
                <div className="rel-header">
                  <h4>
                    Nghề liên quan <em>cùng pipeline</em>
                  </h4>
                  <span className="hint">
                    Hover để xem thu nhập &amp; mảng việc
                  </span>
                </div>
              ),
              body: (
                <div className="rel-list">
                  {NGHE_SIDEBAR_NGHE.map((item) => (
                    <StaticRelItem key={item.name} item={item} />
                  ))}
                </div>
              ),
            }}
            nganh={{
              header: (
                <div className="rel-header">
                  <h4>
                    Ngành học vào nghề <em>3 ngành ĐT</em>
                  </h4>
                  <span className="hint">
                    Hover để xem mã ngành &amp; thời gian
                  </span>
                </div>
              ),
              body: (
                <div className="rel-list">
                  {NGHE_SIDEBAR_NGANH.map((item) => (
                    <StaticRelItem key={item.name} item={item} />
                  ))}
                </div>
              ),
            }}
          />

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
          <h2 className="section-h">
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

          <h2 className="section-h">
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

          <h2 className="section-h">
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

          <div className="section-link">
            <h3>
              Tác phẩm liên quan <em>— từ cộng đồng CINs</em>
            </h3>
            <Link href="#">Xem tất cả →</Link>
          </div>
          <div className="gallery">
            {NGHE_GALLERY.map((g) => (
              <div key={g.handle} className="gal-item">
                <div className="thumb" />
                <div className="info">
                  <span className="av" style={{ background: g.av }} />
                  <span className="nm">{g.handle}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      </main>
    </div>
  );
}
