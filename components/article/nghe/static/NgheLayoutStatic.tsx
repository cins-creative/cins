import Image from "next/image";
import Link from "next/link";

import {
  NGHE_GALLERY,
  NGHE_JOB_CARDS,
  NGHE_LEAD_HTML,
  NGHE_SIDEBAR_KEYWORDS,
  NGHE_SIDEBAR_NGANH,
  NGHE_SIDEBAR_NGHE,
  NGHE_SW_TILES,
} from "@/components/article/nghe/static/nghe-static-data";
import {
  StaticRelCard,
  StaticRelItem,
  StaticRelTile,
} from "@/components/article/nghe/static/NgheStaticParts";
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

/** Khung tĩnh — bám sát OpenDesign `first-draft-layout-nghe.html` (chưa map DB). */
export function NgheLayoutStatic() {
  return (
    <div className="article-wrap article-wrap--nghe-first-draft">
      <main className="article-main">
        <div className="article-grid">
        <div className="nghe-main-sidebar-row">
        <div className="nghe-grid-primary">
          <div className="nghe-hero-panel" data-rich-hero-slot="true">
            <div className="l1-hero">
              <h1 className="h-disp nghe-hero-title">
                3D Modeller
                <br />
                <em>người dựng hình ảnh</em>
              </h1>
              <div className="nghe-hero-row">
                <div className="nghe-hero-copy">
                  <span className="kicker k-nghe">
                    Nghề nghiệp · Ngành Game · Phim
                  </span>
                  <p className="h-summary">
                    Người xây dựng mô hình 3 chiều cho game, phim, quảng cáo và
                    kiến trúc — từ nhân vật, vũ khí, props đến cả một thành phố.
                  </p>
                </div>
                <div className="mascot">
                  <Image
                    src="/assets/mascot-technical-artist.png"
                    alt="Technical artist mascot"
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
            <div
              className="nghe-lead-rich"
              dangerouslySetInnerHTML={{ __html: NGHE_LEAD_HTML }}
            />
          </div>
        </div>

        <aside className="article-side">
          <NgheSidebarTabs
            keyword={{
              header: (
                <div className="rel-header">
                  <h4>
                    Keyword liên quan <em>6 kỹ thuật</em>
                  </h4>
                  <span className="hint">Hover để xem mô tả</span>
                </div>
              ),
              body: (
                <div className="rel-list">
                  {NGHE_SIDEBAR_KEYWORDS.map((item) => (
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
            {NGHE_JOB_CARDS.map((card) => (
              <StaticRelCard key={card.name} item={card} />
            ))}
          </div>

          <h2 className="section-h">
            <span className="num">04</span>
            Phần mềm sử dụng
          </h2>
          <div className="sw-row">
            {NGHE_SW_TILES.map((tile) => (
              <StaticRelTile key={tile.name} item={tile} />
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
