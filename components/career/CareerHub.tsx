import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";

import { CareerHubCongDongSection } from "@/components/career/CareerHubCongDongSection";
import { CareerHubDeptTabs } from "@/components/career/CareerHubDeptTabs";
import { CareerHubPageHead } from "@/components/career/CareerHubPageHead";
import { CareerHubMobileRail } from "@/components/career/CareerHubMobileRail";
import { CareerHubRail } from "@/components/career/CareerHubRail";
import { CareerHubRoleCard } from "@/components/career/CareerHubRoleCard";
import { NganhHubAddButton } from "@/components/nganh/hub/NganhHubAddButton";
import { NganhHubAdminToolbar } from "@/components/nganh/hub/NganhHubAdminToolbar";
import { NganhHubEditProvider } from "@/components/nganh/hub/NganhHubEditContext";
import { NganhHubCard } from "@/components/nganh/NganhHubCard";
import { MissingSupabaseEnvNotice } from "@/components/cins/MissingSupabaseEnvNotice";
import { getCoverUrl } from "@/lib/articles/cover";
import type { CongDongOrgCategoryPreview } from "@/lib/cong-dong/categories";
import type { CareerHubSection } from "@/lib/career/hubSections";
import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import { deptCardThemeByIndex } from "@/lib/career/hubRailTheme";
import type { LinhVucSidebarGroup } from "@/lib/career/groupLinhVuc";
import type { LinhVucRow, NgheNghiepHubItem } from "@/lib/career/types";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { NganhHubItem, NganhHubSection, NganhSidebarGroup } from "@/lib/nganh/types";

function linhTitle(lv: LinhVucRow | null): string {
  if (!lv) return "Khám phá nghề nghiệp";
  return lv.ten_en ?? lv.ten_vi ?? lv.ten ?? String(lv.slug ?? "");
}

function linhTitleVi(lv: LinhVucRow | null): string {
  if (!lv) return "Nghề nghiệp";
  return lv.ten_vi ?? lv.ten ?? lv.ten_en ?? "Nghề nghiệp";
}

function hubRailSelectionLabel(
  tab: TabKey,
  activeLinhVuc: LinhVucRow | null,
  activeNhomLabel: string | null,
): string {
  if (tab === "nganh-hoc") {
    return activeNhomLabel?.trim() || "Tất cả ngành";
  }
  if (!activeLinhVuc) return "Tất cả lĩnh vực";
  return (
    activeLinhVuc.ten_vi ??
    activeLinhVuc.ten ??
    activeLinhVuc.ten_en ??
    activeLinhVuc.slug ??
    "Lĩnh vực"
  );
}

function hubRailGroupLabel(
  groups: LinhVucSidebarGroup[],
  activeSlug: string,
): string | null {
  if (!activeSlug) return null;
  for (const group of groups) {
    if (!group.heading) continue;
    if (group.links.some((lv) => (lv.slug ?? "") === activeSlug)) {
      return group.heading;
    }
  }
  return null;
}

function HubRail({
  tab,
  hubBase,
  linhVucSidebarGroups,
  activeLinhVuc,
  slugForLink,
  nganhSidebarGroups,
  activeNhomId,
  activeNhomLabel,
}: {
  tab: TabKey;
  hubBase: string;
  linhVucSidebarGroups: LinhVucSidebarGroup[];
  activeLinhVuc: LinhVucRow | null;
  slugForLink: string;
  nganhSidebarGroups: NganhSidebarGroup[];
  activeNhomId: string;
  activeNhomLabel: string | null;
}) {
  return (
    <CareerHubMobileRail
      tab={tab}
      selectionLabel={hubRailSelectionLabel(
        tab,
        activeLinhVuc,
        activeNhomLabel,
      )}
      groupLabel={
        tab === "nghe"
          ? hubRailGroupLabel(linhVucSidebarGroups, slugForLink)
          : null
      }
    >
      <CareerHubRail
        tab={tab}
        hubBase={hubBase}
        sidebarGroups={linhVucSidebarGroups}
        activeSlug={slugForLink}
        nganhSidebarGroups={nganhSidebarGroups}
        activeNhomId={activeNhomId}
      />
    </CareerHubMobileRail>
  );
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
  /** Cộng đồng gắn lĩnh vực đang xem (hub nghề). */
  communities?: CongDongOrgCategoryPreview[];
};

export function CareerHub({
  tab,
  hubBase = NGHE_NGHIEP_HUB_PATH,
  linhVucSidebarGroups,
  activeLinhVuc,
  searchQuery,
  groups,
  tagGroups,
  sampleCareers,
  showLinhVucOnCards = false,
  showFallbackNote,
  detailPathPrefix = NGHE_NGHIEP_HUB_PATH,
  listError,
  nganhSidebarGroups = [],
  activeNhomId = "",
  activeNhomLabel = null,
  nganhGroups = [],
  sampleNganh = [],
  nganhListError,
  nganhHubCanEdit = false,
  communities = [],
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
  const congDongHref = slugForLink
    ? `/cong-dong?linh_vuc=${encodeURIComponent(slugForLink)}`
    : "/cong-dong";
  const communityCount = communities.length;
  const heroArtSrc =
    slugForLink.includes("game") || heroTitle.toLowerCase().includes("game")
      ? "/assets/illustration-gamepad.png"
      : "/assets/career-illustration-1.png";
  const heroThumbUrl = getCoverUrl(activeLinhVuc?.cover_id);

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
          activeLinhVuc={activeLinhVuc}
          activeNhomLabel={activeNhomLabel}
        />
        <div className="hn-main">
          <HubRail
            tab={tab}
            hubBase={hubBase}
            linhVucSidebarGroups={linhVucSidebarGroups}
            activeLinhVuc={activeLinhVuc}
            slugForLink={slugForLink}
            nganhSidebarGroups={nganhSidebarGroups}
            activeNhomId={activeNhomId}
            activeNhomLabel={activeNhomLabel}
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
                <Image
                  src="/assets/nganh-hub-character.png"
                  alt=""
                  width={500}
                  height={500}
                  className="hn-ad-hero-visual-img"
                  priority
                />
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
      <CareerHubPageHead tab={tab} activeLinhVuc={activeLinhVuc} />

      <div className="hn-main">
        <HubRail
          tab={tab}
          hubBase={hubBase}
          linhVucSidebarGroups={linhVucSidebarGroups}
          activeLinhVuc={activeLinhVuc}
          slugForLink={slugForLink}
          nganhSidebarGroups={nganhSidebarGroups}
          activeNhomId={activeNhomId}
          activeNhomLabel={activeNhomLabel}
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
              <div className="hn-ad-meta">
                <div className="hn-ad-stats" role="group" aria-label="Thống kê lĩnh vực">
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
                {tab === "nghe" && slugForLink ? (
                  <Link
                    href={congDongHref}
                    className={`hn-hero-cong-dong${
                      communityCount > 0 ? " hn-hero-cong-dong--pile" : ""
                    }`}
                    aria-label={`Xem cộng đồng trong lĩnh vực ${heroTitleVi}`}
                  >
                    {communityCount > 0 ? (
                      <span className="hn-hero-cong-dong-avatars" aria-hidden>
                        {communities.map((org) => {
                          const avatarUrl = getAvatarUrl(org.avatarId);
                          return (
                            <span
                              key={org.id}
                              className="hn-hero-cong-dong-avatar"
                              title={org.ten}
                            >
                              {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="" />
                              ) : (
                                <span>{org.ten.charAt(0).toUpperCase()}</span>
                              )}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="hn-hero-cong-dong-icon" aria-hidden>
                        <Users size={18} strokeWidth={2} />
                      </span>
                    )}
                    <span className="hn-hero-cong-dong-body">
                      <span className="hn-hero-cong-dong-copy">
                        <strong>
                          {communityCount > 0
                            ? `${communityCount} cộng đồng`
                            : "Cộng đồng"}
                        </strong>
                        <span>quanh {heroTitleVi}</span>
                      </span>
                      <span className="hn-hero-cong-dong-go" aria-hidden>
                        Xem
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="hn-ad-hero-visual" aria-hidden>
              <Image
                src={heroThumbUrl ?? heroArtSrc}
                alt=""
                width={200}
                height={200}
                className="hn-ad-hero-visual-img"
                priority
                unoptimized={Boolean(heroThumbUrl)}
              />
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

          {tab === "nghe" && !searchQuery ? (
            <CareerHubCongDongSection
              communities={communities}
              linhVucLabel={heroTitleVi}
              linhVucSlug={slugForLink || null}
            />
          ) : null}

        </div>
      </div>
    </div>
  );
}
