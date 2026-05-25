import Image from "next/image";
import Link from "next/link";

import { CareerHubDeptTabs } from "@/components/career/CareerHubDeptTabs";
import { CareerHubPageHead } from "@/components/career/CareerHubPageHead";
import { CareerHubRail } from "@/components/career/CareerHubRail";
import { CareerHubRoleCard } from "@/components/career/CareerHubRoleCard";
import { NganhHubAddButton } from "@/components/nganh/hub/NganhHubAddButton";
import { NganhHubAdminToolbar } from "@/components/nganh/hub/NganhHubAdminToolbar";
import { NganhHubEditProvider } from "@/components/nganh/hub/NganhHubEditContext";
import { NganhHubCard } from "@/components/nganh/NganhHubCard";
import { MissingSupabaseEnvNotice } from "@/components/cins/MissingSupabaseEnvNotice";
import type { CareerHubSection } from "@/lib/career/hubSections";
import { deptCardThemeByIndex } from "@/lib/career/hubRailTheme";
import type { LinhVucSidebarGroup } from "@/lib/career/groupLinhVuc";
import type { LinhVucRow, NgheNghiepHubItem } from "@/lib/career/types";
import type { NganhHubItem, NganhHubSection, NganhSidebarGroup } from "@/lib/nganh/types";

function linhTitle(lv: LinhVucRow | null): string {
  if (!lv) return "Khám phá nghề nghiệp";
  return lv.ten_en ?? lv.ten_vi ?? lv.ten ?? String(lv.slug ?? "");
}

function linhTitleVi(lv: LinhVucRow | null): string {
  if (!lv) return "Nghề nghiệp";
  return lv.ten_vi ?? lv.ten ?? lv.ten_en ?? "Nghề nghiệp";
}

type TabKey = "nghe" | "nganh-hoc";

type Props = {
  tab: TabKey;
  /** Trang hub chính — `/nganh-hoc` hoặc `/nghe-nghiep`. */
  hubBase?: string;
  linhVucSidebarGroups: LinhVucSidebarGroup[];
  activeLinhVuc: LinhVucRow | null;
  searchQuery: string;
  groups: CareerHubSection[];
  tagGroups?: CareerHubSection[];
  sampleCareers: NgheNghiepHubItem[];
  showLinhVucOnCards?: boolean;
  showFallbackNote?: boolean;
  detailPathPrefix?: string;
  listError?: { reason: "no_env" | "query_error"; message?: string };
  nganhSidebarGroups?: NganhSidebarGroup[];
  activeNhomId?: string;
  activeNhomLabel?: string | null;
  nganhGroups?: NganhHubSection[];
  sampleNganh?: NganhHubItem[];
  nganhListError?: { reason: "no_env" | "query_error"; message?: string };
  /** Bật toolbar + sửa thumbnail / thêm ngành trên hub `/nganh-hoc`. */
  nganhHubCanEdit?: boolean;
};

export function CareerHub({
  tab,
  hubBase = "/nghe-nghiep",
  linhVucSidebarGroups,
  activeLinhVuc,
  searchQuery,
  groups,
  tagGroups,
  sampleCareers,
  showLinhVucOnCards = false,
  showFallbackNote,
  detailPathPrefix = "/nghe-nghiep",
  listError,
  nganhSidebarGroups = [],
  activeNhomId = "",
  activeNhomLabel = null,
  nganhGroups = [],
  sampleNganh = [],
  nganhListError,
  nganhHubCanEdit = false,
}: Props) {
  const detailHref = (slug: string) =>
    `${detailPathPrefix.replace(/\/$/, "")}/${slug}`;
  const sectionsNav = groups;
  const tagsNav = tagGroups ?? groups;
  const heroTitle = linhTitle(activeLinhVuc);
  const heroTitleVi = linhTitleVi(activeLinhVuc);
  const linhMoTa = activeLinhVuc?.mo_ta?.trim();
  const firstJobDesc = sampleCareers.find((c) => c.short_description?.trim())
    ?.short_description;
  const heroBody =
    linhMoTa && linhMoTa.length > 0
      ? linhMoTa
      : firstJobDesc?.trim() ??
        `Khám phá các vị trí công việc trong lĩnh vực ${heroTitle} — mô tả ngắn, kỹ năng và lộ trình gợi ý trên CINs.`;

  const slugForLink = activeLinhVuc?.slug ?? "";
  const heroArtSrc =
    slugForLink.includes("game") || heroTitle.toLowerCase().includes("game")
      ? "/assets/illustration-gamepad.png"
      : "/assets/career-illustration-1.png";

  const careerCount = sampleCareers.length;
  const deptCount = sectionsNav.length;
  const linhVucCount = linhVucSidebarGroups.reduce(
    (n, g) => n + g.links.length,
    0,
  );

  const deptTabs = tagsNav.map((g) => ({
    id: g.id,
    title: g.title,
    count: g.careers.length,
  }));

  if (tab === "nganh-hoc") {
    const nganhCount = sampleNganh.length;
    const heroNhom = activeNhomLabel?.trim() || "đại học";
    const nganhDeptTabs = nganhGroups.map((g) => ({
      id: g.id,
      title: g.title,
      count: g.items.length,
    }));

    const hubUi = (
      <div
        className={`career-hub career-hub--hn career-hub--nganh${
          nganhHubCanEdit ? " career-hub--can-edit" : ""
        }`}
      >
        {nganhHubCanEdit ? <NganhHubAdminToolbar /> : null}
        <CareerHubPageHead
          tab={tab}
          hubBase={hubBase}
          activeLinhVuc={activeLinhVuc}
          activeSlug={slugForLink}
          searchQuery={searchQuery}
          activeNhomLabel={activeNhomLabel}
          activeNhomId={activeNhomId}
        />
        <div className="hn-main">
          <CareerHubRail
            tab={tab}
            hubBase={hubBase}
            sidebarGroups={linhVucSidebarGroups}
            activeSlug={slugForLink}
            nganhSidebarGroups={nganhSidebarGroups}
            activeNhomId={activeNhomId}
          />
          <div className="hn-content">
            <section className="hn-ad-hero" aria-labelledby="hn-nganh-hero-title">
              <div className="hn-ad-hero-text">
                <p className="hn-eyebrow">khám phá · ngành học</p>
                <h1 id="hn-nganh-hero-title">
                  <span className="em">Ngành học · {heroNhom}</span>
                  Chọn đúng ngành
                </h1>
                <p className="hn-ad-hero-desc">
                  Mã ngành, khối thi và nhóm ngành — tra cứu nhanh trước khi chọn
                  trường. Mỗi ngành có trang chi tiết với môn học, nghề liên quan
                  và danh sách trường đào tạo.
                </p>
              </div>
              <div className="hn-ad-hero-visual" aria-hidden>
                <span className="hn-ad-pin hn-ad-pin-1">
                  {nganhCount} ngành · CINs
                </span>
                <div className="hn-ad-hero-card hn-ad-hero-card--nganh">
                  <Image
                    src="/assets/career-illustration-1.png"
                    alt=""
                    width={200}
                    height={200}
                    className="hn-ad-hero-card-img"
                    priority
                  />
                </div>
                <span className="hn-ad-pin hn-ad-pin-2">Mã ngành · Khối thi</span>
              </div>
            </section>

            {nganhDeptTabs.length > 0 ? (
              <CareerHubDeptTabs groups={nganhDeptTabs} />
            ) : null}

            {nganhListError ? (
              <div className="hn-empty">
                <p className="cins-body">
                  {nganhListError.reason === "no_env" ? (
                    <MissingSupabaseEnvNotice />
                  ) : (
                    <>
                      <strong>Không tải được danh sách ngành học.</strong>
                      {nganhListError.message ? (
                        <span className="block mt-2 text-sm opacity-90">
                          {nganhListError.message}
                        </span>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
            ) : nganhGroups.length === 0 ? (
              <div className="hn-empty">
                <p className="cins-body">
                  {searchQuery
                    ? "Không có ngành khớp từ khóa — thử bỏ bộ lọc hoặc từ khác."
                    : "Chưa có ngành đào tạo nào được xuất bản."}
                </p>
              </div>
            ) : (
              nganhGroups.map((group, groupIndex) => (
                <section
                  key={group.id}
                  id={group.id}
                  className="hn-dept"
                  aria-labelledby={`${group.id}-title`}
                >
                  <header className="hn-dept-head">
                    <div>
                      <h2 className="hn-dept-name" id={`${group.id}-title`}>
                        {group.title}
                        <span className="hn-dept-badge">
                          {String(groupIndex + 1).padStart(2, "0")} ·{" "}
                          {group.items.length} ngành
                        </span>
                      </h2>
                      {group.intro?.trim() ? (
                        <p className="hn-dept-desc">{group.intro.trim()}</p>
                      ) : null}
                    </div>
                    <NganhHubAddButton
                      nhomId={group.nhomId}
                      sectionTitle={group.title}
                    />
                  </header>
                  <ul className="hn-role-grid">
                    {group.items.map((item) => (
                      <NganhHubCard
                        key={item.id}
                        item={item}
                        href={`/nganh-hoc/${item.slug}`}
                        deptTheme={deptCardThemeByIndex(groupIndex)}
                        nhomId={group.nhomId}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}

            <section className="hn-foot-strip" aria-labelledby="hn-nganh-foot-title">
              <div>
                <h3 id="hn-nganh-foot-title">
                  Chưa chắc ngành nào <em>phù hợp</em>? Làm bài quiz 2 phút.
                </h3>
                <p>
                  Gợi ý hướng ngành dựa trên sở thích — kết hợp với khám phá nghề
                  nghiệp trên CINs.
                </p>
              </div>
              <Link href="#" className="hn-foot-btn">
                Làm quiz miễn phí <span aria-hidden="true">→</span>
              </Link>
            </section>
          </div>
        </div>
      </div>
    );

    if (nganhHubCanEdit) {
      return <NganhHubEditProvider canEdit>{hubUi}</NganhHubEditProvider>;
    }
    return hubUi;
  }

  return (
    <div className="career-hub career-hub--hn">
      <CareerHubPageHead
        tab={tab}
        hubBase={hubBase}
        activeLinhVuc={activeLinhVuc}
        activeSlug={slugForLink}
        searchQuery={searchQuery}
      />

      <div className="hn-main">
        <CareerHubRail
          tab={tab}
          hubBase={hubBase}
          sidebarGroups={linhVucSidebarGroups}
          activeSlug={slugForLink}
        />

        <div className="hn-content">
          <section className="hn-ad-hero" aria-labelledby="hn-hero-title">
            <div className="hn-ad-hero-text">
              <p className="hn-eyebrow">khám phá · nghề nghiệp</p>
              <h1 id="hn-hero-title">
                <span className="em">Hướng nghiệp · {heroTitleVi}</span>
                {heroTitle}
              </h1>
              <p className="hn-ad-hero-desc">{heroBody}</p>
              {showFallbackNote ? (
                <p className="hn-fallback-note">
                  Một số bài nghề chưa gán lĩnh vực — đang hiển thị toàn bộ bài
                  đã xuất bản.
                </p>
              ) : null}
              <div className="hn-ad-stats">
                <div className="hn-ad-stat">
                  <span className="n">{careerCount}</span>
                  <span className="l">vị trí nghề</span>
                </div>
                <div className="hn-ad-stat">
                  <span className="n">{deptCount}</span>
                  <span className="l">bộ phận</span>
                </div>
                <div className="hn-ad-stat">
                  <span className="n">{linhVucCount}</span>
                  <span className="l">lĩnh vực</span>
                </div>
              </div>
            </div>
            <div className="hn-ad-hero-visual" aria-hidden>
              <span className="hn-ad-pin hn-ad-pin-1">
                {careerCount} vị trí · CINs
              </span>
              <div className="hn-ad-hero-card">
                <Image
                  src={heroArtSrc}
                  alt=""
                  width={200}
                  height={200}
                  className="hn-ad-hero-card-img"
                  priority
                />
              </div>
              <span className="hn-ad-pin hn-ad-pin-2">Khám phá nghề</span>
            </div>
          </section>

          {deptTabs.length > 0 ? <CareerHubDeptTabs groups={deptTabs} /> : null}

          {listError ? (
            <div className="hn-empty">
              <p className="cins-body">
                {listError.reason === "no_env" ? (
                  <MissingSupabaseEnvNotice />
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
            <div className="hn-empty">
              <p className="cins-body">
                {searchQuery
                  ? "Không có vị trí khớp từ khóa — thử bỏ bộ lọc hoặc từ khác."
                  : "Chưa có bài nghề nào được xuất bản trong lĩnh vực này."}
              </p>
            </div>
          ) : (
            sectionsNav.map((group, groupIndex) => (
              <section
                key={group.id}
                id={group.id}
                className="hn-dept"
                aria-labelledby={`${group.id}-title`}
              >
                <header className="hn-dept-head">
                  <div>
                    <h2 className="hn-dept-name" id={`${group.id}-title`}>
                      {group.title}
                      <span className="hn-dept-badge">
                        {String(groupIndex + 1).padStart(2, "0")} ·{" "}
                        {group.careers.length} vị trí
                      </span>
                    </h2>
                    {group.intro?.trim() ? (
                      <p className="hn-dept-desc">{group.intro.trim()}</p>
                    ) : null}
                  </div>
                </header>
                <ul className="hn-role-grid">
                  {group.careers.map((n) => (
                    <CareerHubRoleCard
                      key={n.id}
                      career={n}
                      href={detailHref(n.slug)}
                      deptTheme={deptCardThemeByIndex(groupIndex)}
                      showLinhVuc={showLinhVucOnCards}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}

          <section className="hn-foot-strip" aria-labelledby="hn-foot-title">
            <div>
              <h3 id="hn-foot-title">
                Vẫn đang phân vân giữa các <em>vị trí nghề</em>? Làm bài quiz 2
                phút.
              </h3>
              <p>
                15 câu hỏi nhanh dựa trên tính cách và sở thích — kết quả gợi ý
                hướng phát triển phù hợp trên CINs.
              </p>
            </div>
            <Link href="#" className="hn-foot-btn">
              Làm quiz miễn phí <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
