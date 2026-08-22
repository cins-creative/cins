"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { CoSoAdminToolbar } from "@/components/co-so/CoSoAdminToolbar";
import { useCoSoMobileShell } from "@/components/co-so/useCoSoMobileShell";
import { CoSoTabBaidang } from "@/components/co-so/tabs/CoSoTabBaidang";
import {
  CoSoTabHinhanhLazy,
  CoSoTabKhoaHocLazy,
  CoSoTabSanPhamLazy,
  CoSoTabSuKienLazy,
  CoSoTabTuyenDungLazy,
  prefetchCoSoTab,
} from "@/components/org/org-tab-lazy-views";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import {
  TruongInlineEditProvider,
  useTruongInlineEdit,
} from "@/components/truong/inline/TruongInlineEditContext";
import { CoSoSchoolSidebar } from "@/components/co-so/CoSoSchoolSidebar";
import { CoSoUpcomingSidebar } from "@/components/co-so/CoSoUpcomingSidebar";
import {
  CO_SO_TAB_LABELS,
  type CoSoTabId,
} from "@/lib/to-chuc/co-so-page-cau-hinh";
import type { SystemRole } from "@/lib/auth/system-role";
import type { CoSoDetailPayload } from "@/lib/to-chuc/co-so-page-queries";
import { countActiveStudioJobs } from "@/lib/to-chuc/studio-tuyen-dung-format";
import { CO_SO_KHOA_UPDATED_EVENT } from "@/lib/to-chuc/co-so-khoa-events";
import {
  fetchCoSoKhoaHocListCached,
  invalidateCoSoKhoaHocListCache,
} from "@/lib/to-chuc/khoa-hoc-client-cache";
import { isKhoaHocMuted } from "@/lib/to-chuc/khoa-hoc-labels";
import { coSoQuanLyPath, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { useCoSoTabNav } from "@/lib/to-chuc/use-co-so-tab-nav";
import { useChromeStuck } from "@/lib/ui/use-chrome-stuck";
import { useOrgStudioJobs } from "@/lib/to-chuc/use-org-studio-jobs";
import { coSoToInlinePayload } from "@/lib/to-chuc/co-so-inline-payload";

const TABS = [
  { id: "bai-dang", label: CO_SO_TAB_LABELS["bai-dang"], num: "01" },
  { id: "khoa-hoc", label: CO_SO_TAB_LABELS["khoa-hoc"], num: "02" },
  { id: "san-pham", label: CO_SO_TAB_LABELS["san-pham"], num: "03" },
  { id: "hinh-anh", label: CO_SO_TAB_LABELS["hinh-anh"], num: "04" },
  { id: "su-kien", label: CO_SO_TAB_LABELS["su-kien"], num: "05" },
  { id: "tuyen-dung", label: CO_SO_TAB_LABELS["tuyen-dung"], num: "06" },
] as const satisfies ReadonlyArray<{ id: CoSoTabId; label: string; num: string }>;

type Props = {
  payload: CoSoDetailPayload;
  canEdit?: boolean;
  /** Member org thật (trục 2) — khoá theo dõi/nhắn tin chính org của mình. */
  isOrgMember?: boolean;
  canManageKhoaHoc?: boolean;
  systemRole?: SystemRole | null;
  viewerLoggedIn?: boolean;
};

function coSoTabPrefetch(tab: CoSoTabId) {
  if (tab === "bai-dang") return;
  prefetchCoSoTab(tab);
}

function CoSoDetailViewInner({
  payload,
  canEdit = false,
  canManageKhoaHoc = false,
  viewerLoggedIn = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school ?? payload.school;
  const orgSlug = school.slug;
  const {
    tab,
    khoaSlug,
    jobId,
    baiDangId,
    suKienId,
    selectTab,
    openKhoa,
    closeKhoa,
  } = useCoSoTabNav(orgSlug);
  const { jobs } = useOrgStudioJobs(school.id);
  const [mountedTabs, setMountedTabs] = useState<Set<CoSoTabId>>(
    () => new Set([tab]),
  );
  const editableMedia = canEdit && Boolean(ctx?.canEdit);
  const { isMobileShell } = useCoSoMobileShell();
  const tabsBarRef = useRef<HTMLDivElement>(null);
  useChromeStuck(tabsBarRef);

  const activeJobCount = useMemo(() => countActiveStudioJobs(jobs), [jobs]);

  const [khoaBadgeRequested, setKhoaBadgeRequested] = useState(tab === "khoa-hoc");
  const [activeKhoaCount, setActiveKhoaCount] = useState(0);

  useEffect(() => {
    if (tab === "khoa-hoc") setKhoaBadgeRequested(true);
  }, [tab]);

  useEffect(() => {
    if (!khoaBadgeRequested) return;
    let cancelled = false;
    const load = (force = false) => {
      void fetchCoSoKhoaHocListCached(school.id, force ? { force: true } : undefined)
        .then((khoaHoc) => {
          if (cancelled) return;
          setActiveKhoaCount(
            khoaHoc.reduce(
              (n, k) => (isKhoaHocMuted(k.trangThaiKhoaHoc) ? n : n + 1),
              0,
            ),
          );
        })
        .catch(() => {});
    };
    load();
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ orgId?: string }>).detail;
      if (!detail || detail.orgId === school.id) {
        invalidateCoSoKhoaHocListCache(school.id);
        load(true);
      }
    };
    window.addEventListener(CO_SO_KHOA_UPDATED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CO_SO_KHOA_UPDATED_EVENT, onChange);
    };
  }, [school.id, khoaBadgeRequested]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  const shellClass = [
    "tdh-v6-shell",
    ctx?.isEditing ? "tdh-v6-shell--editing" : "",
    isMobileShell ? "tdh-v6-shell--mobile-tabs" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const { baidang, hinhanh } = payload;

  return (
    <>
      <div
        className={shellClass}
        data-mobile-shell={isMobileShell ? "1" : undefined}
      >
      <CoSoSchoolSidebar
        school={school}
        hocVienXacThucCount={payload.hocVienXacThucCount}
        canEditMedia={canEdit}
        isMobileShell={isMobileShell}
        isMobileShellActive
      />

      <div className="tdh-v6-center">
        {!isMobileShell ? (
          <div className="tdh-v6-cover-mobile">
            <TruongOrgCover
              school={school}
              layout="v6"
              editable={editableMedia}
            />
          </div>
        ) : null}

        <div ref={tabsBarRef} className="tdh-v6-tabs-bar">
          <div
            className="tdh-v6-tabs"
            role="tablist"
            aria-label="Nội dung cơ sở đào tạo"
          >
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={coSoTabPath(orgSlug, t.id)}
                scroll={false}
                role="tab"
                aria-selected={tab === t.id}
                id={`cso-tab-${t.id}`}
                aria-controls={`cso-panel-${t.id}`}
                className={`tdh-v6-tab${tab === t.id ? " on" : ""}`}
                onMouseEnter={() => {
                  coSoTabPrefetch(t.id);
                  if (t.id === "khoa-hoc") setKhoaBadgeRequested(true);
                }}
                onFocus={() => {
                  coSoTabPrefetch(t.id);
                  if (t.id === "khoa-hoc") setKhoaBadgeRequested(true);
                }}
                onClick={(event) => {
                  event.preventDefault();
                  if (tab !== t.id || khoaSlug || jobId || baiDangId || suKienId) {
                    selectTab(t.id);
                  }
                }}
              >
                {t.label}
                {t.id === "tuyen-dung" && activeJobCount > 0 ? (
                  <span
                    className="tdh-v6-tab-badge"
                    aria-label={`${activeJobCount} tin đang tuyển`}
                  >
                    {activeJobCount}
                  </span>
                ) : null}
                {t.id === "khoa-hoc" && activeKhoaCount > 0 ? (
                  <span
                    className="tdh-v6-tab-badge"
                    aria-label={`${activeKhoaCount} khóa đang hoạt động`}
                  >
                    {activeKhoaCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        {TABS.map((t) => {
          const isActive = tab === t.id;
          const isMounted = mountedTabs.has(t.id);
          if (!isMounted) return null;

          return (
            <div
              key={t.id}
              id={`cso-panel-${t.id}`}
              role="tabpanel"
              aria-labelledby={`cso-tab-${t.id}`}
              hidden={!isActive}
              className={`tdh-v6-panel${isActive ? " on" : ""}`}
            >
              {t.id === "bai-dang" ? (
                <CoSoTabBaidang
                  posts={baidang}
                  school={school}
                  orgId={school.id}
                  orgSlug={orgSlug}
                  canEdit={canEdit}
                  activeBaiDangId={tab === "bai-dang" ? baiDangId : null}
                />
              ) : null}
              {t.id === "khoa-hoc" ? (
                <CoSoTabKhoaHocLazy
                  orgId={school.id}
                  orgSlug={orgSlug}
                  orgTen={school.ten}
                  orgDiaChi={school.dia_chi}
                  canManageKhoaHoc={canManageKhoaHoc}
                  khoaSlug={khoaSlug}
                  onOpenKhoa={openKhoa}
                  onCloseKhoa={closeKhoa}
                  onReplaceKhoa={(slug) => openKhoa(slug, "replace")}
                />
              ) : null}
              {t.id === "su-kien" ? (
                <CoSoTabSuKienLazy
                  orgId={school.id}
                  orgSlug={orgSlug}
                  orgTen={school.ten}
                  orgDiaChi={school.dia_chi}
                  orgTinhThanh={school.tinh_thanh}
                  canManageSuKien={canManageKhoaHoc}
                  activeSuKienId={tab === "su-kien" ? suKienId : null}
                  detailPathMode="co-so"
                />
              ) : null}
              {t.id === "san-pham" ? (
                <CoSoTabSanPhamLazy
                  orgId={school.id}
                  num={t.num}
                  canManageKhoaHoc={canManageKhoaHoc}
                />
              ) : null}
              {t.id === "hinh-anh" ? (
                <CoSoTabHinhanhLazy images={hinhanh} />
              ) : null}
              {t.id === "tuyen-dung" ? (
                <CoSoTabTuyenDungLazy
                  jobs={jobs}
                  orgId={school.id}
                  orgSlug={orgSlug}
                  orgTen={school.ten}
                  canEdit={canEdit}
                  viewerLoggedIn={viewerLoggedIn}
                  activeJobId={tab === "tuyen-dung" ? jobId : null}
                  num={t.num}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <CoSoUpcomingSidebar
        orgId={school.id}
        orgSlug={orgSlug}
        orgDiaChi={school.dia_chi}
        orgTinhThanh={school.tinh_thanh}
        canManageKhoaHoc={canManageKhoaHoc}
        isMobileShell={isMobileShell}
        isMobileShellActive
        onOpenKhoa={openKhoa}
      />
      </div>
    </>
  );
}

function CoSoDetailViewBody({
  payload,
  canEdit,
  canManageKhoaHoc,
  viewerLoggedIn,
}: Props) {
  const orgSlug = payload.school.slug;

  return (
    <>
      {canEdit ? (
        <CoSoAdminToolbar
          quanLyHref={coSoQuanLyPath(orgSlug)}
        />
      ) : null}
      <CoSoDetailViewInner
        payload={payload}
        canEdit={canEdit}
        canManageKhoaHoc={canManageKhoaHoc}
        viewerLoggedIn={viewerLoggedIn}
      />
    </>
  );
}

export function CoSoDetailView({
  payload,
  canEdit = false,
  isOrgMember = false,
  canManageKhoaHoc = false,
  systemRole = null,
  viewerLoggedIn = false,
}: Props) {
  const pathname = usePathname() ?? "";
  if (pathname.includes("/manage")) {
    return null;
  }

  return (
    <TruongInlineEditProvider
      canEdit={canEdit}
      isOrgMember={isOrgMember}
      systemRole={systemRole}
      initial={coSoToInlinePayload(payload)}
    >
      <CoSoDetailViewBody
        payload={payload}
        canEdit={canEdit}
        canManageKhoaHoc={canManageKhoaHoc}
        viewerLoggedIn={viewerLoggedIn}
      />
    </TruongInlineEditProvider>
  );
}
