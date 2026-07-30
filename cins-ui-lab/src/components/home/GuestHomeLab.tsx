"use client";

import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { GUEST_HOME_FIXTURE } from "@/mocks/guest-home";

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

/**
 * Visual fork of GuestHomeView — presentation + fixtures only.
 *
 * LOGIC_TOUCH ids on this surface:
 * - home.session-gate
 * - home.guest-data
 * - home.guest-login-panel (OAuth / LoginActions)
 */
export function GuestHomeLab() {
  const data = GUEST_HOME_FIXTURE;
  const { stats } = data;

  return (
    <div className="gh-page" data-screen-label="Lab-Guest-Home">
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

              <div className="gh-lv-row" aria-label="Lĩnh vực nghề">
                <span className="gh-lv-label">Khám phá theo lĩnh vực</span>
                {data.linhVucs.map((lv) => (
                  <Link
                    key={lv.slug}
                    href={`/entity?type=linh-vuc&slug=${lv.slug}`}
                    className="gh-lv-chip"
                    style={
                      { "--gh-lv-accent": lv.accent } as CSSProperties
                    }
                  >
                    {lv.ten}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          <section className="gh-section" aria-labelledby="gh-majors">
            <SectionHead
              eyebrow="ngành đào tạo"
              title="Ngành học trên CINs"
              href="/entity?type=nganh"
              linkLabel="Khám phá ngành"
            />
            <ul className="gh-major-grid" id="gh-majors">
              {data.majors.map((major) => (
                <li key={major.id}>
                  <Link
                    href={`/entity?type=nganh&slug=${major.slug}`}
                    className="gh-major-card"
                  >
                    <div className="gh-major-cover gh-major-cover--empty">
                      <GraduationCap size={24} aria-hidden />
                    </div>
                    <div className="gh-major-body">
                      <h3 className="gh-major-title">{major.title}</h3>
                      {major.maNganh ? (
                        <span className="gh-major-code">{major.maNganh}</span>
                      ) : null}
                      {major.khoiThi.length > 0 ? (
                        <span className="gh-major-khoi">
                          Khối {major.khoiThi.slice(0, 3).join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="gh-section" aria-labelledby="gh-schools">
            <SectionHead
              eyebrow="trường đại học"
              title="Cơ sở đào tạo nổi bật"
              href="/entity?type=truong"
              linkLabel="Xem danh sách"
            />
            <ul className="gh-school-grid" id="gh-schools">
              {data.schools.map((school) => (
                <li key={school.id}>
                  <Link
                    href={`/entity?type=truong&slug=${school.slug}`}
                    className="gh-school-card"
                  >
                    <div className="gh-school-cover">
                      <div className="gh-school-cover-bg cov-blue" aria-hidden />
                    </div>
                    <div className="gh-school-body">
                      <div className="gh-school-head-text">
                        <h3 className="gh-school-name">{school.ten}</h3>
                      </div>
                      <div className="gh-school-locbar">
                        <span className="gh-school-loc">
                          {school.thanhPho ?? "Việt Nam"}
                        </span>
                      </div>
                      <div className="gh-school-foot">
                        <div className="gh-school-stat-block">
                          <span className="gh-school-stat-num">
                            {school.nganhCount}
                          </span>
                          <span className="gh-school-stat-unit">ngành</span>
                        </div>
                        <span className="gh-school-arrow" aria-hidden>
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="gh-section" aria-labelledby="gh-careers">
            <SectionHead
              eyebrow="nghề nghiệp"
              title="Nghề đang được quan tâm"
              href="/entity?type=nghe"
              linkLabel="Khám phá nghề"
            />
            <ul className="gh-career-grid" id="gh-careers">
              {data.careers.map((career) => (
                <li key={career.id}>
                  <Link
                    href={`/entity?type=nghe&slug=${career.slug}`}
                    className="gh-career-card"
                    data-theme="g-design"
                  >
                    <div className="gh-career-thumb">
                      <Sparkles size={28} strokeWidth={1.6} aria-hidden />
                    </div>
                    <div className="gh-career-body">
                      <span className="gh-career-vi">{career.title}</span>
                      {career.linhVuc ? (
                        <span className="gh-career-tag">{career.linhVuc}</span>
                      ) : null}
                    </div>
                    <ArrowRight
                      size={16}
                      className="gh-career-arrow"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="gh-section" aria-labelledby="gh-courses">
            <SectionHead
              eyebrow="khóa học"
              title="Khóa học gợi ý"
              href="/entity?type=khoa-hoc"
              linkLabel="Tìm khóa học"
            />
            <ul className="gh-course-grid" id="gh-courses">
              {data.courses.map((course) => (
                <li key={course.id}>
                  <div className="gh-course-card">
                    <div className="gh-course-thumb" aria-hidden />
                    <div className="gh-course-body">
                      <span className="gh-course-org">{course.orgName}</span>
                      <h3 className="gh-course-title">{course.title}</h3>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="gh-section" aria-labelledby="gh-events">
            <SectionHead
              eyebrow="sự kiện"
              title="Sắp diễn ra"
              href="/entity?type=su-kien"
              linkLabel="Xem lịch"
            />
            <ul className="gh-event-list" id="gh-events">
              {data.events.map((ev) => {
                const d = formatEventDate(ev.startsAt);
                return (
                  <li key={ev.id}>
                    <div className="gh-event-card">
                      <div className="gh-event-banner">
                        <div className="gh-event-banner-fallback" aria-hidden />
                        <div className="gh-event-date">
                          <span className="gh-event-day">{d.day}</span>
                          <span className="gh-event-mon">{d.mon}</span>
                        </div>
                      </div>
                      <div className="gh-event-body">
                        <h3 className="gh-event-title">{ev.title}</h3>
                        <p className="gh-event-meta">{ev.location}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="gh-section gh-section--last" aria-labelledby="gh-works">
            <SectionHead
              eyebrow="gallery"
              title="Tác phẩm cộng đồng"
              href="/gallery"
              linkLabel="Mở Gallery"
            />
            <ul className="gh-work-grid" id="gh-works">
              {data.works.map((work) => (
                <li key={work.id}>
                  <div className="gh-work-card">
                    <div className="gh-work-cover" aria-hidden />
                    <div className="gh-work-body">
                      <h3 className="gh-work-title">{work.title}</h3>
                      <span className="gh-work-author">{work.authorName}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="gh-aside" aria-label="Đăng nhập">
          {/*
            LOGIC_TOUCH: home.guest-login-panel
            Real: GuestHomeLoginPanel → LoginActions (Google OAuth / PKCE)
            Mock: static CTA linking to /login lab route
            Apply: restore LoginActions + auth/callback; do not keep mock CTA
          */}
          <section className="gh-login-panel" id="home-login">
            <header className="gh-login-head">
              <p className="gh-eyebrow">tài khoản miễn phí</p>
              <h2 className="gh-login-title">
                Xây dựng hành trình sáng tạo của bạn
              </h2>
              <p className="gh-login-lead">
                Đăng ký trong 30 giây — lưu portfolio, đăng ký open day và nhận
                gợi ý ngành phù hợp.
              </p>
            </header>
            <div className="hg-login-actions" style={{ display: "grid", gap: 10 }}>
              <Link
                href="/login"
                className="lab-chrome-btn"
                style={{
                  textAlign: "center",
                  background: "var(--cins-blue)",
                  border: "none",
                  padding: "12px 16px",
                  borderRadius: 12,
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                Đăng nhập / Đăng ký (mock)
              </Link>
            </div>
            <ul className="gh-login-perks" aria-label="Lợi ích tài khoản CINs">
              <li>
                <span className="gh-login-perk-ico" aria-hidden>
                  ✦
                </span>
                <span className="gh-login-perk-copy">
                  <strong>Journey</strong>
                  <span>Lưu lại hành trình sáng tạo của bạn</span>
                </span>
              </li>
              <li>
                <span className="gh-login-perk-ico" aria-hidden>
                  ✦
                </span>
                <span className="gh-login-perk-copy">
                  <strong>Verify</strong>
                  <span>Xác thực từ tổ chức uy tín</span>
                </span>
              </li>
              <li>
                <span className="gh-login-perk-ico" aria-hidden>
                  ✦
                </span>
                <span className="gh-login-perk-copy">
                  <strong>Khám phá</strong>
                  <span>Gợi ý ngành nghề</span>
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
