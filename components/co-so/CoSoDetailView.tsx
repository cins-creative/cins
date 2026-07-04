"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CoSoAdminToolbar } from "@/components/co-so/CoSoAdminToolbar";
import { CoSoMobileShellNav } from "@/components/co-so/CoSoMobileShellNav";
import { useCoSoMobileShell } from "@/components/co-so/useCoSoMobileShell";
import {
  CoSoPageSettingsModal,
  type CoSoSettingsSection,
} from "@/components/co-so/CoSoPageSettingsModal";
import { CoSoTabBaidang } from "@/components/co-so/tabs/CoSoTabBaidang";
import { CoSoTabPlaceholder } from "@/components/co-so/tabs/CoSoTabPlaceholder";
import {
  CoSoTabHinhanhLazy,
  CoSoTabKhoaHocLazy,
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
import type { CoSoDetailPayload, CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";
import { countActiveStudioJobs } from "@/lib/to-chuc/studio-tuyen-dung-format";
import { CO_SO_KHOA_UPDATED_EVENT } from "@/lib/to-chuc/co-so-khoa-events";
import { isKhoaHocMuted } from "@/lib/to-chuc/khoa-hoc-labels";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { useCoSoTabNav } from "@/lib/to-chuc/use-co-so-tab-nav";
import { useOrgStudioJobs } from "@/lib/to-chuc/use-org-studio-jobs";
import { coSoToInlinePayload } from "@/lib/to-chuc/co-so-inline-payload";
import type { TruongChiNhanh } from "@/lib/truong/types";

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

type SettingsSavedPatch = {
  slug?: string;
  ten?: string;
  filters?: CoSoFilterChip[];
  loaiCoSo?: string;
  namThanhLap?: number | null;
  giayPhepDaoTao?: string | null;
  moTa?: string | null;
  gioiThieuTruong?: string | null;
  diaChi?: string | null;
  dienThoai?: string | null;
  emailLienHe?: string | null;
  tinhThanh?: string | null;
  website?: string | null;
  chiNhanh?: TruongChiNhanh[];
  facebook?: string | null;
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
  settingsOpen = false,
  settingsSection = "identity",
  onSettingsOpenChange,
  onOpenSettings,
}: Props & {
  settingsOpen?: boolean;
  settingsSection?: CoSoSettingsSection;
  onSettingsOpenChange?: (open: boolean) => void;
  onOpenSettings?: (section: CoSoSettingsSection) => void;
}) {
  const ctx = useTruongInlineEdit();
  const [filters, setFilters] = useState(payload.filters);
  const [daVerify, setDaVerify] = useState(payload.daVerify);
  const [schoolExtra, setSchoolExtra] = useState<Partial<typeof payload.school>>({});
  const { baidang, hinhanh } = payload;
  const baseSchool = ctx?.school ?? payload.school;
  const school = { ...baseSchool, ...schoolExtra };
  const orgSlug = school.slug;
  const { tab, khoaSlug, jobId, selectTab } = useCoSoTabNav(orgSlug);
  const { jobs } = useOrgStudioJobs(school.id);
  const [mountedTabs, setMountedTabs] = useState<Set<CoSoTabId>>(
    () => new Set([tab]),
  );
  const editableMedia = canEdit && Boolean(ctx?.canEdit);
  const { isMobileShell, mobileTab, setMobileTab } = useCoSoMobileShell("content");

  const activeJobCount = useMemo(() => countActiveStudioJobs(jobs), [jobs]);

  const [khoaBadgeRequested, setKhoaBadgeRequested] = useState(tab === "khoa-hoc");
  const [activeKhoaCount, setActiveKhoaCount] = useState(0);

  useEffect(() => {
    if (tab === "khoa-hoc") setKhoaBadgeRequested(true);
  }, [tab]);

  useEffect(() => {
    if (!khoaBadgeRequested) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/co-so/${school.id}/khoa-hoc`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { khoaHoc?: KhoaHocCardData[] } | null) => {
          if (cancelled || !data?.khoaHoc) return;
          setActiveKhoaCount(
            data.khoaHoc.reduce(
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
      if (!detail || detail.orgId === school.id) load();
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

  function handleSettingsSaved(patch: SettingsSavedPatch) {
    if (patch.filters) setFilters(patch.filters);
    setSchoolExtra((prev) => ({
      ...prev,
      ...(patch.ten ? { ten: patch.ten } : {}),
      ...(patch.moTa !== undefined ? { mo_ta: patch.moTa } : {}),
      ...(patch.gioiThieuTruong !== undefined
        ? { gioi_thieu_truong: patch.gioiThieuTruong }
        : {}),
      ...(patch.loaiCoSo ? { loai_truong: patch.loaiCoSo } : {}),
      ...(patch.namThanhLap !== undefined
        ? { nam_thanh_lap: patch.namThanhLap }
        : {}),
      ...(patch.giayPhepDaoTao !== undefined
        ? { giay_phep_dao_tao: patch.giayPhepDaoTao }
        : {}),
      ...(patch.diaChi !== undefined ? { dia_chi: patch.diaChi } : {}),
      ...(patch.dienThoai !== undefined ? { dien_thoai: patch.dienThoai } : {}),
      ...(patch.emailLienHe !== undefined
        ? { email_lien_he: patch.emailLienHe }
        : {}),
      ...(patch.tinhThanh !== undefined ? { tinh_thanh: patch.tinhThanh } : {}),
      ...(patch.website !== undefined ? { website: patch.website } : {}),
      ...(patch.chiNhanh ? { chi_nhanh: patch.chiNhanh } : {}),
      ...(patch.facebook !== undefined ? { facebook: patch.facebook } : {}),
    }));
    ctx?.applySchoolPatch({
      ...(patch.ten ? { ten: patch.ten } : {}),
      ...(patch.moTa !== undefined ? { mo_ta: patch.moTa } : {}),
      ...(patch.gioiThieuTruong !== undefined
        ? { gioi_thieu_truong: patch.gioiThieuTruong }
        : {}),
      ...(patch.loaiCoSo ? { loai_truong: patch.loaiCoSo } : {}),
      ...(patch.namThanhLap !== undefined
        ? { nam_thanh_lap: patch.namThanhLap }
        : {}),
      ...(patch.giayPhepDaoTao !== undefined
        ? { giay_phep_dao_tao: patch.giayPhepDaoTao }
        : {}),
      ...(patch.diaChi !== undefined ? { dia_chi: patch.diaChi } : {}),
      ...(patch.dienThoai !== undefined ? { dien_thoai: patch.dienThoai } : {}),
      ...(patch.emailLienHe !== undefined
        ? { email_lien_he: patch.emailLienHe }
        : {}),
      ...(patch.tinhThanh !== undefined ? { tinh_thanh: patch.tinhThanh } : {}),
      ...(patch.website !== undefined ? { website: patch.website } : {}),
      ...(patch.chiNhanh ? { chi_nhanh: patch.chiNhanh } : {}),
      ...(patch.facebook !== undefined ? { facebook: patch.facebook } : {}),
    });
  }

  return (
    <>
      <div
        className={shellClass}
        data-mobile-tab={isMobileShell ? mobileTab : undefined}
      >
      {isMobileShell ? (
        <CoSoMobileShellNav value={mobileTab} onChange={setMobileTab} />
      ) : null}
      <CoSoSchoolSidebar
        school={school}
        daVerify={daVerify}
        canEditMedia={canEdit}
        onOpenSettings={onOpenSettings}
        isMobileShell={isMobileShell}
        isMobileShellActive={mobileTab === "info"}
      />

      <div
        className="tdh-v6-center"
        id="cso-shell-panel-content"
        role={isMobileShell ? "tabpanel" : undefined}
        aria-labelledby={isMobileShell ? "cso-shell-tab-content" : undefined}
        hidden={isMobileShell ? mobileTab !== "content" : undefined}
        aria-hidden={isMobileShell ? mobileTab !== "content" : undefined}
      >
        {!isMobileShell ? (
          <div className="tdh-v6-cover-mobile">
            <TruongOrgCover
              school={school}
              layout="v6"
              editable={editableMedia}
            />
          </div>
        ) : null}

        <div className="tdh-v6-tabs-bar">
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
                  if (tab !== t.id || khoaSlug || jobId) {
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
                  canEdit={canEdit}
                  filters={filters}
                />
              ) : null}
              {t.id === "khoa-hoc" ? (
                <CoSoTabKhoaHocLazy
                  orgId={school.id}
                  orgSlug={orgSlug}
                  orgTen={school.ten}
                  orgDiaChi={school.dia_chi}
                  orgVerified={daVerify}
                  canManageKhoaHoc={canManageKhoaHoc}
                  khoaSlug={khoaSlug}
                />
              ) : null}
              {t.id === "su-kien" ? (
                <CoSoTabSuKienLazy
                  orgId={school.id}
                  orgTen={school.ten}
                  orgDiaChi={school.dia_chi}
                  orgTinhThanh={school.tinh_thanh}
                  canManageSuKien={canManageKhoaHoc}
                />
              ) : null}
              {t.id === "san-pham" ? (
                <CoSoTabPlaceholder
                  num={t.num}
                  title="Sản phẩm học viên"
                  hint="Sản phẩm học viên sẽ hiện khi học viên đăng tác phẩm gắn với cơ sở."
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
        isMobileShellActive={mobileTab === "notify"}
      />
      </div>

      {canEdit && onSettingsOpenChange ? (
        <CoSoPageSettingsModal
          open={settingsOpen}
          orgId={school.id}
          initialSection={settingsSection}
          onClose={() => onSettingsOpenChange(false)}
          onSaved={(patch) => {
            handleSettingsSaved(patch);
            ctx?.showToast("Đã cập nhật cài đặt trang.");
          }}
        />
      ) : null}
    </>
  );
}

function CoSoDetailViewBody({
  payload,
  canEdit,
  canManageKhoaHoc,
  viewerLoggedIn,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<CoSoSettingsSection>("identity");

  function openSettings(section: CoSoSettingsSection = "identity") {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

  return (
    <>
      {canEdit ? (
        <CoSoAdminToolbar onOpenSettings={() => openSettings("identity")} />
      ) : null}
      <CoSoDetailViewInner
        payload={payload}
        canEdit={canEdit}
        canManageKhoaHoc={canManageKhoaHoc}
        viewerLoggedIn={viewerLoggedIn}
        settingsOpen={settingsOpen}
        settingsSection={settingsSection}
        onSettingsOpenChange={canEdit ? setSettingsOpen : undefined}
        onOpenSettings={canEdit ? openSettings : undefined}
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
