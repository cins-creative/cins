import Image from "next/image";
import Link from "next/link";

import { CareerHubCardThumb } from "@/components/career/CareerHubCardThumb";
import { CareerHubSideAccordion } from "@/components/career/CareerHubSideAccordion";
import { introForBoPhan } from "@/lib/career/boPhanIntro";
import { MsIcon } from "@/components/cins/MsIcon";
import type { BoPhanGroup } from "@/lib/career/groupCareers";
import type { LinhVucSidebarGroup } from "@/lib/career/groupLinhVuc";
import type { LinhVucRow, NgheNghiepHubItem } from "@/lib/career/types";

function linhTitle(lv: LinhVucRow | null): string {
  if (!lv) return "Khám phá nghề nghiệp";
  return lv.ten_en ?? lv.ten_vi ?? String(lv.slug ?? "");
}

function jobTitle(n: NgheNghiepHubItem): string {
  return n.title_eng ?? n.title_vietnam ?? n.slug;
}

type TabKey = "nghe" | "nganh-hoc";

type Props = {
  tab: TabKey;
  linhVucSidebarGroups: LinhVucSidebarGroup[];
  activeLinhVuc: LinhVucRow | null;
  searchQuery: string;
  groups: BoPhanGroup[];
  /** Nav “Bộ phận”: chỉ các nhóm có nghề thuộc lĩnh vực đang chọn (khác `groups` khi fallback DB) */
  tagGroups?: BoPhanGroup[];
  /** Nghề thuộc lĩnh vực (để mô tả hero) */
  sampleCareers: NgheNghiepHubItem[];
  /** Hiển thị khi không có linh_vuc_id — đang xem toàn bộ */
  showFallbackNote?: boolean;
  /** Đường dẫn chi tiết từng card — mặc định `/nghe-nghiep` */
  detailPathPrefix?: string;
  /** Lỗi tải danh sách (Supabase / query) */
  listError?: { reason: "no_env" | "query_error"; message?: string };
  /** Bật chọn/dán ảnh → Cloudflare → Supabase (cần env token + Cloudflare + service role) */
  thumbEditorEnabled?: boolean;
};

export function CareerHub({
  tab,
  linhVucSidebarGroups,
  activeLinhVuc,
  searchQuery,
  groups,
  tagGroups,
  sampleCareers,
  showFallbackNote,
  detailPathPrefix = "/nghe-nghiep",
  listError,
  thumbEditorEnabled = false,
}: Props) {
  const detailHref = (slug: string) =>
    `${detailPathPrefix.replace(/\/$/, "")}/${slug}`;
  const tagsNav = tagGroups ?? groups;
  const heroTitle = linhTitle(activeLinhVuc);
  const firstDesc = sampleCareers.find((c) => c.short_description?.trim())
    ?.short_description;
  const heroBody =
    firstDesc?.trim() ??
    `Khám phá các vị trí công việc trong lĩnh vực ${heroTitle} — mô tả ngắn, kỹ năng và lộ trình gợi ý trên CINs.`;

  const slugForLink = activeLinhVuc?.slug ?? "";
  const heroArtSrc =
    slugForLink.includes("game") || heroTitle.toLowerCase().includes("game")
      ? "/assets/illustration-gamepad.png"
      : "/assets/career-illustration-1.png";

  if (tab === "nganh-hoc") {
    return (
      <div className="career-hub">
        <div className="page career-hub-page-inner">
          <div className="career-hub-layout">
            <CareerHubSidebar
              tab={tab}
              sidebarGroups={linhVucSidebarGroups}
              activeSlug={slugForLink}
            />
            <div className="career-hub-main">
            <section className="career-hub-panel career-surface career-hub-placeholder">
              <h2 className="cins-h2 career-hub-placeholder-title">
                Ngành học đại học
              </h2>
              <p className="cins-body career-hub-placeholder-text">
                Danh mục ngành học và chương trình đào tạo đang được cập nhật.
                Bạn có thể xem{" "}
                <Link href="/" className="text-[var(--cins-blue)] font-semibold">
                  trang chủ
                </Link>{" "}
                hoặc mục trường đại học sau khi nội dung được đăng tải.
              </p>
            </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="career-hub">
      <div className="page career-hub-page-inner">
        <div className="career-hub-layout">
          <CareerHubSidebar
            tab={tab}
            sidebarGroups={linhVucSidebarGroups}
            activeSlug={slugForLink}
          />

          <div className="career-hub-main">
          <section className="career-hub-hero career-surface">
            <div className="career-hub-hero-grid">
              <div className="career-hub-hero-copy">
                <p className="career-hub-eyebrow">Lĩnh vực</p>
                <h1 className="career-hub-hero-title cins-h1">{heroTitle}</h1>
                <p className="career-hub-hero-desc cins-body-lg">{heroBody}</p>
                <div className="career-hub-search-row">
                  <form
                    action="/nghe-nghiep"
                    method="get"
                    className="career-hub-search-form"
                    role="search"
                  >
                    <input type="hidden" name="linh_vuc" value={slugForLink} />
                    <input
                      type="search"
                      name="q"
                      defaultValue={searchQuery}
                      placeholder="Nhập tên vị trí công việc mà bạn quan tâm"
                      className="career-hub-search-input"
                      aria-label="Tìm vị trí công việc"
                    />
                    <button type="submit" className="sr-only">
                      Tìm
                    </button>
                  </form>
                </div>
                {showFallbackNote ? (
                  <p className="career-hub-fallback-note cins-caption">
                    Một số bài nghề chưa gán lĩnh vực — đang hiển thị toàn bộ
                    bài đã xuất bản.
                  </p>
                ) : null}
              </div>
              <div className="career-hub-hero-art" aria-hidden>
                <Image
                  src={heroArtSrc}
                  alt=""
                  width={320}
                  height={280}
                  className="career-hub-hero-img"
                  priority
                />
              </div>
            </div>
          </section>

          {tagsNav.length > 0 ? (
            <nav className="career-hub-tags" aria-label="Bộ phận">
              {tagsNav.map((g) => (
                <a key={g.id} href={`#${g.id}`} className="career-hub-tag">
                  {g.boPhan}
                </a>
              ))}
            </nav>
          ) : null}

          <div className="career-hub-sections">
            {listError ? (
              <div className="career-hub-empty career-surface">
                <p className="cins-body">
                  {listError.reason === "no_env" ? (
                    <>
                      <strong>Chưa cấu hình Supabase.</strong> Thêm biến môi
                      trường trong <code>.env.local</code> rồi chạy lại dev
                      server.
                    </>
                  ) : (
                    <>
                      <strong>Không tải được danh sách bài nghề.</strong>
                      {listError.message ? (
                        <span className="block mt-2 text-sm opacity-90">
                          {listError.message}
                        </span>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
            ) : groups.length === 0 ? (
              <div className="career-hub-empty career-surface">
                <p className="cins-body">
                  {searchQuery
                    ? "Không có vị trí khớp từ khóa — thử bỏ bộ lọc hoặc từ khác."
                    : "Chưa có bài nghề nào được xuất bản trong lĩnh vực này."}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <section
                  key={group.id}
                  id={group.id}
                  className="career-hub-section career-surface"
                >
                  <header className="career-hub-section-head">
                    <h2 className="cins-h2 career-hub-section-title">
                      {group.boPhan === "Khác"
                        ? "Vị trí khác"
                        : /bộ phận/i.test(group.boPhan)
                          ? group.boPhan
                          : `Bộ phận ${group.boPhan}`}
                    </h2>
                    <p className="cins-body career-hub-section-intro">
                      {group.mo_ta?.trim()
                        ? group.mo_ta.trim()
                        : introForBoPhan(group.boPhan)}
                    </p>
                  </header>
                  <ul className="career-hub-card-grid">
                    {group.careers.map((n) =>
                      thumbEditorEnabled ? (
                        <li key={n.id}>
                          <div className="career-hub-card career-hub-card--split">
                            <CareerHubCardThumb
                              careerId={n.id}
                              thumbnailUrl={n.thumbnail_mascot}
                              editorEnabled
                            />
                            <Link
                              href={detailHref(n.slug)}
                              className="career-hub-card-title-link"
                            >
                              <span className="career-hub-card-title">
                                {jobTitle(n)}
                              </span>
                            </Link>
                          </div>
                        </li>
                      ) : (
                        <li key={n.id}>
                          <Link
                            href={detailHref(n.slug)}
                            className="career-hub-card"
                          >
                            <CareerHubCardThumb
                              careerId={n.id}
                              thumbnailUrl={n.thumbnail_mascot}
                              editorEnabled={false}
                            />
                            <span className="career-hub-card-title">
                              {jobTitle(n)}
                            </span>
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              ))
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CareerHubSidebar({
  tab,
  sidebarGroups,
  activeSlug,
}: {
  tab: TabKey;
  sidebarGroups: LinhVucSidebarGroup[];
  activeSlug: string;
}) {
  const base = "/nghe-nghiep";
  return (
    <aside className="career-hub-sidebar career-surface" aria-label="Lĩnh vực">
      <div className="career-hub-tabs" role="tablist">
        <Link
          href={base}
          className={`career-hub-tab${tab === "nghe" ? " is-active" : ""}`}
          role="tab"
          aria-selected={tab === "nghe"}
        >
          Nghề nghiệp
        </Link>
        <Link
          href={`${base}?tab=nganh-hoc`}
          className={`career-hub-tab${tab === "nganh-hoc" ? " is-active" : ""}`}
          role="tab"
          aria-selected={tab === "nganh-hoc"}
        >
          Ngành học
        </Link>
      </div>
      <nav className="career-hub-side-nav" aria-label="Danh sách lĩnh vực">
        {sidebarGroups.map((group) => {
          const sideLinks = (
            <ul className="career-hub-side-list">
              {group.links.map((lv) => {
                const slug = lv.slug ?? "";
                const active = slug === activeSlug && tab === "nghe";
                const label = lv.ten_en ?? lv.ten_vi ?? slug;
                if (!slug) return null;
                return (
                  <li key={lv.id}>
                    <Link
                      href={`${base}?linh_vuc=${encodeURIComponent(slug)}`}
                      className={`career-hub-side-link${active ? " is-active" : ""}`}
                    >
                      <span className="career-hub-side-link-inner">
                        <MsIcon
                          name="chevron_right"
                          className="career-hub-side-link-icon"
                        />
                        <span className="career-hub-side-link-label">
                          {label}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          );

          if (!group.heading) {
            return (
              <div
                key={group.id}
                className="career-hub-side-group career-hub-side-stack career-hub-side-stack--flat"
              >
                {sideLinks}
              </div>
            );
          }

          const openDefault =
            tab === "nghe" &&
            group.links.some((lv) => (lv.slug ?? "") === activeSlug);

          return (
            <div
              key={group.id}
              className="career-hub-side-group career-hub-side-stack"
            >
              <CareerHubSideAccordion
                heading={group.heading}
                defaultOpen={openDefault}
              >
                {sideLinks}
              </CareerHubSideAccordion>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
