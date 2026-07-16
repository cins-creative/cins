import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Calendar,
  GraduationCap,
  MapPin,
  Sparkles,
} from "lucide-react";

import { GuestHomeSchoolCard } from "@/components/cins/guest-home/GuestHomeSchoolCard";
import { GuestHomeLoginPanel } from "@/components/cins/home-v2/GuestHomeLoginPanel";
import {
  CO_SO_DAO_TAO_HUB_PATH,
  NGANH_HOC_HUB_PATH,
  NGHE_NGHIEP_HUB_PATH,
  ngheNghiepDetailHref,
  TIM_KHOA_HOC_HUB_PATH,
} from "@/lib/cins/hubPaths";
import type { GuestHomeData } from "@/lib/cins/guest-home/loadGuestHomeData";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import { articlePublicHref } from "@/lib/articles/article-href";
import { railGroupThemeClass } from "@/lib/career/hubRailTheme";
import { truongListingHref } from "@/lib/truong/listing-href";

import "@/app/guest-home.css";

type Props = {
  data: GuestHomeData;
};

function formatStat(n: number): string {
  if (n <= 0) return "—";
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  return String(n);
}

function formatEventDate(iso: string): { day: string; mon: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "—", mon: "" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    mon: d.toLocaleDateString("vi-VN", { month: "short" }),
  };
}

function SectionHead({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="gh-section-head">
      <div>
        <p className="gh-eyebrow">{eyebrow}</p>
        <h2 className="gh-section-title">{title}</h2>
      </div>
      <Link href={href} className="gh-section-link">
        {linkLabel}
        <ArrowRight size={16} strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}

export function GuestHomeView({ data }: Props) {
  const { stats } = data;

  return (
    <div className="gh-page">
      <div className="gh-layout">
        <div className="gh-main">
          <header className="gh-hero">
            <div className="gh-hero-glow gh-hero-glow--blue" aria-hidden />
            <div className="gh-hero-glow gh-hero-glow--violet" aria-hidden />
            <div className="gh-hero-glow gh-hero-glow--mint" aria-hidden />
            <div className="gh-hero-inner">
              <div className="gh-hero-copy">
                <p className="gh-hero-kicker">
                  <span className="gh-hero-kicker-dot" aria-hidden />
                  CINs · creative hub Việt Nam
                </p>
                <h1 className="gh-hero-title">
                  Chọn{" "}
                  <span className="gh-hero-highlight">ngành sáng tạo</span>{" "}
                  không còn là nỗi lo của cha mẹ.
                </h1>
                <p className="gh-hero-lead">
                  Dữ liệu thật từ{" "}
                  <strong>{formatStat(stats.nghe)} nghề</strong>,{" "}
                  <strong>{formatStat(stats.nganh)} ngành đào tạo</strong> và{" "}
                  <strong>{formatStat(stats.truong + stats.coSo)} cơ sở</strong>{" "}
                  trên CINs — cùng sự kiện, khóa học và portfolio cộng đồng.
                </p>
              </div>

              <dl className="gh-stats">
                <div className="gh-stat gh-stat--nganh">
                  <dt>Ngành đào tạo</dt>
                  <dd>{formatStat(stats.nganh)}</dd>
                </div>
                <div className="gh-stat gh-stat--truong">
                  <dt>Trường &amp; cơ sở</dt>
                  <dd>{formatStat(stats.truong + stats.coSo)}</dd>
                </div>
                <div className="gh-stat gh-stat--nghe">
                  <dt>Nghề nghiệp</dt>
                  <dd>{formatStat(stats.nghe)}</dd>
                </div>
                <div className="gh-stat gh-stat--lv">
                  <dt>Lĩnh vực</dt>
                  <dd>{formatStat(stats.linhVuc)}</dd>
                </div>
              </dl>

              {data.linhVucs.length > 0 ? (
                <div className="gh-lv-row" aria-label="Lĩnh vực nghề">
                  <span className="gh-lv-label">Khám phá theo lĩnh vực</span>
                  {data.linhVucs.slice(0, 8).map((lv) => (
                    <Link
                      key={lv.slug}
                      href={`${NGHE_NGHIEP_HUB_PATH}?linh_vuc=${encodeURIComponent(lv.slug)}`}
                      className="gh-lv-chip"
                      style={
                        lv.accent
                          ? ({ "--gh-lv-accent": lv.accent } as CSSProperties)
                          : undefined
                      }
                    >
                      {lv.ten}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          {data.majors.length > 0 ? (
            <section className="gh-section" aria-labelledby="gh-majors">
              <SectionHead
                eyebrow="ngành đào tạo"
                title="Ngành học trên CINs"
                href={NGANH_HOC_HUB_PATH}
                linkLabel="Khám phá ngành"
              />
              <ul className="gh-major-grid" id="gh-majors">
                {data.majors.map((major) => {
                  const title =
                    major.titleVi?.trim() || major.title?.trim() || major.slug;
                  return (
                    <li key={major.id}>
                      <Link
                        href={articlePublicHref("nganh_dao_tao", major.slug)}
                        className="gh-major-card"
                      >
                        {major.cover_src ? (
                          <div className="gh-major-cover">
                            <Image
                              src={major.cover_src}
                              alt=""
                              fill
                              className="gh-major-cover-img"
                              sizes="(max-width:640px) 100vw, 240px"
                              unoptimized={
                                major.cover_src.includes("imagedelivery.net")
                              }
                            />
                          </div>
                        ) : (
                          <div className="gh-major-cover gh-major-cover--empty">
                            <GraduationCap size={24} aria-hidden />
                          </div>
                        )}
                        <div className="gh-major-body">
                          <h3 className="gh-major-title">{title}</h3>
                          {major.ma_nganh ? (
                            <span className="gh-major-code">{major.ma_nganh}</span>
                          ) : null}
                          {major.khoi_thi.length > 0 ? (
                            <span className="gh-major-khoi">
                              Khối {major.khoi_thi.slice(0, 3).join(" · ")}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {data.schools.length > 0 ? (
            <section className="gh-section" aria-labelledby="gh-schools">
              <SectionHead
                eyebrow="trường đại học"
                title="Cơ sở đào tạo nổi bật"
                href={CO_SO_DAO_TAO_HUB_PATH}
                linkLabel="Xem danh sách"
              />
              <ul className="gh-school-grid" id="gh-schools">
                {data.schools.map((school, index) => (
                  <li key={school.id}>
                    <GuestHomeSchoolCard
                      school={school}
                      index={index}
                      href={truongListingHref(school)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.careers.length > 0 ? (
            <section className="gh-section" aria-labelledby="gh-careers">
              <SectionHead
                eyebrow="khám phá nghề"
                title="Vị trí nghề đang có trên CINs"
                href={NGHE_NGHIEP_HUB_PATH}
                linkLabel="Xem tất cả"
              />
              <ul className="gh-career-grid" id="gh-careers">
                {data.careers.map((career) => {
                  const theme = railGroupThemeClass(
                    career.article_nhom?.slug ??
                      career.article_nhom?.ten ??
                      career.linh_vuc?.ten ??
                      null,
                  );
                  const thumb = career.thumbnail_mascot?.trim();
                  return (
                    <li key={career.id}>
                      <Link
                        href={ngheNghiepDetailHref(career.slug)}
                        className="gh-career-card"
                        data-theme={theme}
                      >
                        <div className="gh-career-thumb">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              className="gh-career-img"
                              sizes="70px"
                              unoptimized={thumb.includes("imagedelivery.net")}
                            />
                          ) : (
                            <Sparkles size={28} strokeWidth={1.6} aria-hidden />
                          )}
                        </div>
                        <div className="gh-career-body">
                          <span className="gh-career-vi">
                            {career.title_vietnam}
                          </span>
                          {career.title_eng &&
                          career.title_eng !== career.title_vietnam ? (
                            <span className="gh-career-en">
                              {career.title_eng}
                            </span>
                          ) : null}
                          {career.linh_vuc?.ten ? (
                            <span className="gh-career-tag">
                              {career.linh_vuc.ten}
                            </span>
                          ) : null}
                        </div>
                        <ArrowRight
                          size={16}
                          className="gh-career-arrow"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {data.events.length > 0 ? (
            <section className="gh-section" aria-labelledby="gh-events">
              <SectionHead
                eyebrow="sắp diễn ra"
                title="Sự kiện tuyển sinh &amp; cộng đồng"
                href="/su-kien"
                linkLabel="Lịch sự kiện"
              />
              <ul className="gh-event-list" id="gh-events">
                {data.events.map((ev) => {
                  const { day, mon } = formatEventDate(ev.batDau);
                  return (
                    <li key={ev.id}>
                      <Link href="/su-kien" className="gh-event-card">
                        <div className="gh-event-date">
                          <span className="gh-event-day">{day}</span>
                          <span className="gh-event-mon">{mon}</span>
                        </div>
                        <div className="gh-event-body">
                          {ev.loaiLabel ? (
                            <span className="gh-event-type">{ev.loaiLabel}</span>
                          ) : null}
                          <h3 className="gh-event-title">{ev.tieuDe}</h3>
                          {ev.diaDiem ? (
                            <p className="gh-event-meta">
                              <MapPin size={13} aria-hidden />
                              {ev.diaDiem}
                            </p>
                          ) : null}
                        </div>
                        {ev.coverSrc ? (
                          <div className="gh-event-cover">
                            <Image
                              src={ev.coverSrc}
                              alt=""
                              fill
                              className="gh-event-cover-img"
                              sizes="80px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <Calendar
                            size={20}
                            className="gh-event-ico"
                            aria-hidden
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {data.courses.length > 0 ? (
            <section className="gh-section" aria-labelledby="gh-courses">
              <SectionHead
                eyebrow="khóa học ngắn hạn"
                title="Khóa đang mở đăng ký"
                href={TIM_KHOA_HOC_HUB_PATH}
                linkLabel="Tìm khóa học"
              />
              <ul className="gh-course-grid" id="gh-courses">
                {data.courses.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={coSoKhoaHocDetailPath(course.orgSlug, course.slug)}
                      className="gh-course-card"
                    >
                      <div className="gh-course-thumb">
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt=""
                            fill
                            className="gh-course-thumb-img"
                            sizes="96px"
                            unoptimized={
                              course.thumbnailUrl.includes("imagedelivery.net")
                            }
                          />
                        ) : course.orgAvatarUrl ? (
                          <Image
                            src={course.orgAvatarUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="gh-course-org-ava"
                            unoptimized={
                              course.orgAvatarUrl.includes("imagedelivery.net")
                            }
                          />
                        ) : null}
                      </div>
                      <div className="gh-course-body">
                        <span className="gh-course-org">{course.orgTen}</span>
                        <h3 className="gh-course-title">{course.ten}</h3>
                        <span className="gh-course-sub">{course.sub}</span>
                      </div>
                      <ArrowRight size={16} className="gh-course-arrow" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.works.length > 0 ? (
            <section className="gh-section gh-section--last" aria-labelledby="gh-works">
              <SectionHead
                eyebrow="portfolio cộng đồng"
                title="Tác phẩm mới trên CINs"
                href={NGHE_NGHIEP_HUB_PATH}
                linkLabel="Khám phá thêm"
              />
              <ul className="gh-work-grid" id="gh-works">
                {data.works.map((work) => {
                  const href = work.authorSlug
                    ? `/${encodeURIComponent(work.authorSlug)}`
                    : NGHE_NGHIEP_HUB_PATH;
                  return (
                    <li key={work.id}>
                      <Link href={href} className="gh-work-card">
                        <div className="gh-work-cover">
                          {work.coverSrc ? (
                            <Image
                              src={work.coverSrc}
                              alt=""
                              fill
                              className="gh-work-cover-img"
                              sizes="(max-width:640px) 50vw, 200px"
                              unoptimized={
                                work.coverSrc.includes("imagedelivery.net")
                              }
                            />
                          ) : (
                            <Sparkles size={22} aria-hidden />
                          )}
                        </div>
                        <div className="gh-work-body">
                          <h3 className="gh-work-title">{work.title}</h3>
                          {work.authorName ? (
                            <span className="gh-work-author">
                              {work.authorName}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="gh-aside" aria-label="Đăng nhập">
          <GuestHomeLoginPanel />
        </aside>
      </div>
    </div>
  );
}
