import Image from "next/image";
import Link from "next/link";

import { EditorialImages } from "@/components/nganh/EditorialImages";
import { NganhImageBreakPlaceholder } from "@/components/nganh/NganhImageBreakPlaceholder";
import { NganhDetailSidebar } from "@/components/nganh/NganhDetailSidebar";
import { getCoverUrl } from "@/lib/articles/cover";
import { stripImageBreakFromHtml } from "@/lib/nganh/editorialImage";
import {
  heroDescFromArticle,
  heroTitlePartsVi,
} from "@/lib/nganh/parseNoiDung";
import { partitionNganhRelated } from "@/lib/articles/rel-visual";
import type {
  MonHocNganhRow,
  NgheNganhRow,
  NganhDetailBundle,
} from "@/lib/nganh/queries";
import type { ArticleCard } from "@/lib/articles/types";

const MON_COLORS = [
  "c-yellow",
  "c-mint",
  "c-orange",
  "c-violet",
  "c-blue",
] as const;

const JOB_THUMB_TONES = [
  "tone-yellow",
  "tone-mint",
  "tone-orange",
  "tone-violet",
] as const;

type Props = Pick<
  NganhDetailBundle,
  | "article"
  | "parsed"
  | "monHoc"
  | "nghe"
  | "khoiThiLabels"
  | "lienQuan"
  | "soTruong"
>;

function ngheCareerHref(slug: string): string {
  return `/huong-nghiep/nghe/${encodeURIComponent(slug)}`;
}

function ngheLabel(row: NgheNganhRow): string {
  return (row.tieu_de_viet ?? row.tieu_de).trim();
}

function ngheThumbInitials(title: string): string {
  const w = title.split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase() || "NG";
}

function ngheShortDesc(row: NgheNganhRow): string | null {
  const t = row.tom_tat?.trim();
  if (!t) return null;
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

function ngheAsSidebarCards(rows: NgheNganhRow[]): ArticleCard[] {
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    tieu_de: ngheLabel(r),
    loai_bai_viet: "nghe",
    tom_tat: null,
    loai_quan_he: "DUNG_TRONG_NGHE",
  }));
}

function displayTitleVi(article: Props["article"]): string {
  return (article.tieu_de_viet ?? article.tieu_de).trim();
}

function compareNameParts(title: string): { main: string; em: string | null } {
  const { lead, em } = heroTitlePartsVi(title);
  if (!em) return { main: title, em: null };
  if (!lead) return { main: title, em: null };
  return { main: lead, em };
}

export function NganhChiTietView({
  article,
  parsed,
  monHoc,
  nghe,
  khoiThiLabels,
  lienQuan,
  soTruong,
}: Props) {
  const titleVi = displayTitleVi(article);
  const { lead, em } = heroTitlePartsVi(titleVi);
  const meta = article.meta;
  const nhomTen = article.article_nhom?.ten?.trim() ?? "Ngành đào tạo";
  const heroEn = article.tieu_de?.trim() || null;
  const heroDesc = heroDescFromArticle(
    article.mo_ta_ngan,
    article.tom_tat,
    parsed.introHtml,
  );

  const { nganhCompare, keywords, phanMem } = partitionNganhRelated(lienQuan);
  const featuredMon = monHoc.slice(0, 5);
  const overflowMon = monHoc.slice(5);
  const compareItems = parsed.compareItems;
  const thisCompare = compareNameParts(titleVi);
  const ngheSidebar = ngheAsSidebarCards(nghe);
  const editorialImages = meta?.editorial_images ?? [];
  const introHtml =
    parsed.introHtml && editorialImages.length > 0
      ? stripImageBreakFromHtml(parsed.introHtml)
      : parsed.introHtml;

  return (
    <div className="nct-page">
      <section className="nct-hero">
        <div className="nct-hero-bg" aria-hidden>
          <div className="blob-v" />
          <div className="blob-y" />
        </div>
        <div className="nct-hero-inner">
          <div>
            <nav className="nct-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Trang chủ</Link>
              <span>/</span>
              <Link href="/nghe-nghiep?tab=nganh-hoc">Hướng nghiệp</Link>
              <span>/</span>
              <Link href="/nghe-nghiep?tab=nganh-hoc">Ngành đào tạo</Link>
              <span>/</span>
              <span className="here">{titleVi}</span>
            </nav>
            <div className="nct-kicker">
              {nhomTen}
              {meta?.ma_nganh ? (
                <>
                  <span className="code-divider" />
                  <span className="code">{meta.ma_nganh}</span>
                </>
              ) : null}
            </div>
            <h1 className="nct-hero-title">
              {lead ? (
                <>
                  {lead}
                  <em>{em}</em>
                </>
              ) : (
                <em>{em}</em>
              )}
            </h1>
            {heroEn ? <p className="nct-hero-en">{heroEn}</p> : null}
            {heroDesc ? <p className="nct-hero-desc">{heroDesc}</p> : null}
          </div>

          <div className="nct-meta-card">
            <div className="nct-meta-card-head">
              <div>
                <div className="label">Thông tin tuyển sinh</div>
                <h3>{titleVi}</h3>
              </div>
              {meta?.ma_nganh ? (
                <span className="nct-meta-card-badge">{meta.ma_nganh}</span>
              ) : null}
            </div>
            <div>
              {khoiThiLabels.length > 0 ? (
                <div className="nct-meta-row">
                  <span className="nct-meta-row-label">Khối thi</span>
                  <div className="nct-khoi-wrap">
                    {khoiThiLabels.map((k) => (
                      <span key={k} className="nct-khoi">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {meta?.mon_nang_khieu ? (
                <div className="nct-meta-row">
                  <span className="nct-meta-row-label">Môn năng khiếu</span>
                  <span className="nct-meta-row-value">
                    {meta.mon_nang_khieu}
                  </span>
                </div>
              ) : null}
              {meta?.thoi_gian_dao_tao ? (
                <div className="nct-meta-row">
                  <span className="nct-meta-row-label">Thời gian đào tạo</span>
                  <span className="nct-meta-row-value">
                    {meta.thoi_gian_dao_tao}
                  </span>
                </div>
              ) : null}
            </div>
            {soTruong > 0 ? (
              <p className="nct-meta-note">
                Điểm chuẩn và chỉ tiêu khác nhau theo từng trường — xem chi tiết
                khi dữ liệu trường được cập nhật trên CINs.
              </p>
            ) : null}
          </div>
        </div>

        <div className="nct-hero-stats">
          <div className="nct-stat">
            <div className="nct-stat-label">Nhóm ngành</div>
            <div className="nct-stat-value wrap-sm">{nhomTen}</div>
          </div>
          <div className="nct-stat">
            <div className="nct-stat-label">Môn học trong ngành</div>
            <div className="nct-stat-value">
              {monHoc.length}
              <span className="unit">môn</span>
            </div>
            <div className="nct-stat-sub">Cơ bản đến chuyên ngành</div>
          </div>
          <div className="nct-stat">
            <div className="nct-stat-label">Số trường đào tạo</div>
            <div className="nct-stat-value">
              {soTruong > 0 ? soTruong : "—"}
              {soTruong > 0 ? <span className="unit">trường</span> : null}
            </div>
            <div className="nct-stat-sub">Công lập · tư thục</div>
          </div>
          <div className="nct-stat">
            <div className="nct-stat-label">Hình thức học</div>
            <div className="nct-stat-value wrap-sm">
              Toàn
              <br />
              thời gian
            </div>
          </div>
        </div>
      </section>

      <div className="nct-layout">
        <main>
          {editorialImages.length > 0 ? (
            <EditorialImages images={editorialImages} />
          ) : introHtml ? (
            <NganhImageBreakPlaceholder />
          ) : null}

          {introHtml ? (
            <>
              <div className="nct-sec-title">
                <div className="nct-sec-num">01</div>
                <div>
                  <h2 className="nct-sec-h">
                    Ngành <em>{titleVi}</em> là gì?
                  </h2>
                  <div className="nct-sec-sub">Khái niệm · phạm vi · ứng dụng</div>
                </div>
              </div>
              <div
                className="nct-prose body"
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            </>
          ) : null}

          {monHoc.length > 0 ? (
            <>
              <div className="nct-sec-title">
                <div className="nct-sec-num">02</div>
                <div>
                  <h2 className="nct-sec-h">
                    Bạn sẽ học <em>những gì?</em>
                  </h2>
                  <div className="nct-sec-sub">
                    {monHoc.length} môn · {featuredMon.length} môn nổi bật
                  </div>
                </div>
              </div>
              <div className="nct-mon-cards">
                {featuredMon.map((m, i) => (
                  <MonHocCard key={m.id} item={m} color={MON_COLORS[i % 5]!} index={i} />
                ))}
              </div>
              {overflowMon.length > 0 ? (
                <div className="nct-mon-overflow">
                  <span className="nct-mon-overflow-label">
                    {overflowMon.length} môn khác:
                  </span>
                  {overflowMon.map((m) => (
                    <Link
                      key={m.id}
                      href={`/bai-viet/${m.slug}`}
                      className="nct-mon-pill"
                    >
                      {m.tieu_de_viet ?? m.tieu_de}
                    </Link>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {(compareItems.length > 0 || meta?.ma_nganh) && (
            <>
              <div className="nct-sec-title">
                <div className="nct-sec-num">03</div>
                <div>
                  <h2 className="nct-sec-h">
                    Dễ nhầm với <em>ngành nào?</em>
                  </h2>
                  <div className="nct-sec-sub">Phân biệt mã ngành · phạm vi đào tạo</div>
                </div>
              </div>
              <div className="nct-compare-list">
                <div className="nct-compare-row is-this">
                  <div className="nct-compare-left">
                    <span className="nct-compare-tag nct-compare-tag--this">
                      Ngành này
                    </span>
                    <div className="nct-compare-name">
                      {thisCompare.em ? (
                        <>
                          {thisCompare.main} <em>{thisCompare.em}</em>
                        </>
                      ) : (
                        titleVi
                      )}
                    </div>
                    {meta?.ma_nganh ? (
                      <span className="nct-compare-code">{meta.ma_nganh}</span>
                    ) : null}
                  </div>
                  <p className="nct-compare-desc">
                    {heroDesc ||
                      "Ngành đào tạo bạn đang xem trên CINs."}
                  </p>
                </div>
                {compareItems.map((row) => (
                  <div key={`${row.title}-${row.maNganh}`} className="nct-compare-row">
                    <div className="nct-compare-left">
                      <span className="nct-compare-tag">Dễ nhầm</span>
                      <div className="nct-compare-name">{row.title}</div>
                      {row.maNganh ? (
                        <span className="nct-compare-code">{row.maNganh}</span>
                      ) : null}
                    </div>
                    {row.descriptionHtml ? (
                      <div
                        className="nct-compare-desc"
                        dangerouslySetInnerHTML={{ __html: row.descriptionHtml }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}

          {nghe.length > 0 ? (
            <>
              <div className="nct-sec-title">
                <div className="nct-sec-num">04</div>
                <div>
                  <h2 className="nct-sec-h">
                    Ra trường <em>làm nghề gì?</em>
                  </h2>
                  <div className="nct-sec-sub">
                    {nghe.length} hướng nghề nghiệp phổ biến
                  </div>
                </div>
              </div>
              <div className="nct-jobs-grid">
                {nghe.map((row, i) => (
                  <NgheJobCard
                    key={row.id}
                    row={row}
                    href={ngheCareerHref(row.slug)}
                    tone={JOB_THUMB_TONES[i % JOB_THUMB_TONES.length]!}
                  />
                ))}
              </div>
            </>
          ) : null}
        </main>

        <aside className="nct-side-col">
          <NganhDetailSidebar
            nganh={nganhCompare}
            phanMem={phanMem}
            nghe={ngheSidebar}
            keywords={keywords}
            nhomSubtitle={
              article.article_nhom?.mo_ta?.trim() ||
              `Cùng nhóm ${nhomTen} — các ngành có chương trình tương đồng.`
            }
          />
        </aside>
      </div>
    </div>
  );
}

function NgheJobCard({
  row,
  href,
  tone,
}: {
  row: NgheNganhRow;
  href: string;
  tone: string;
}) {
  const title = ngheLabel(row);
  const desc = ngheShortDesc(row);
  const coverUrl = getCoverUrl(row.cover_id);

  return (
    <Link href={href} className="nct-job-card">
      <span className="nct-job-arrow" aria-hidden>
        ↗
      </span>
      <div className={`nct-job-thumb ${tone}`}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            width={320}
            height={180}
            className="nct-job-thumb-img"
            sizes="(max-width: 720px) 50vw, 264px"
          />
        ) : (
          <span className="nct-job-thumb-ph" aria-hidden>
            {ngheThumbInitials(title)}
          </span>
        )}
      </div>
      <div className="nct-job-body">
        <div className="nct-job-title">{title}</div>
        {desc ? <p className="nct-job-desc">{desc}</p> : null}
      </div>
    </Link>
  );
}

function MonHocCard({
  item,
  color,
  index,
}: {
  item: MonHocNganhRow;
  color: string;
  index: number;
}) {
  const label = item.tieu_de_viet ?? item.tieu_de;
  return (
    <Link
      href={`/bai-viet/${item.slug}`}
      className={`nct-mon-card ${color}`}
    >
      <span className="mc-num">
        {String(index + 1).padStart(2, "0")} · Môn học
      </span>
      <div className="mc-name">{label}</div>
      <span className="mc-link">Xem bài viết →</span>
    </Link>
  );
}
