"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCoSoMobileShell } from "@/components/co-so/useCoSoMobileShell";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongAdmissionTimelineSidebar } from "@/components/truong/TruongAdmissionTimelineSidebar";
import { TruongSchoolSidebar } from "@/components/truong/TruongSchoolSidebar";
import {
  TruongPageSettingsModal,
  type TruongSettingsSection,
} from "@/components/truong/TruongPageSettingsModal";
import { TruongAdminToolbar } from "@/components/truong/inline/TruongAdminToolbar";
import {
  TruongInlineEditProvider,
  useTruongInlineEdit,
} from "@/components/truong/inline/TruongInlineEditContext";
import { TruongDoanToolbar } from "@/components/truong/TruongDoanToolbar";
import {
  TruongDoanToolbarProvider,
  useTruongDoanToolbarSlot,
} from "@/components/truong/TruongDoanToolbarContext";
import { TruongTabBaidang } from "@/components/truong/tabs/TruongTabBaidang";
import {
  prefetchTruongTab,
  TruongTabDoanSinhVienLazy,
  TruongTabHinhanhLazy,
  TruongTabNganhLazy,
  TruongTabTuyensinhLazy,
} from "@/components/org/org-tab-lazy-views";
import { YearFilterProvider } from "@/components/truong/YearFilterProvider";
import { useTruongTabNav } from "@/lib/truong/use-truong-tab-nav";
import { formatHocPhiLabel } from "@/lib/truong/display";
import { resolveInitialDisplayYear } from "@/lib/truong/pin-display-year";
import {
  TRUONG_TAB_LABELS,
  truongTabPath,
  type TruongTabId,
} from "@/lib/truong/truong-routes";
import {
  mergeTruongYearOptions,
  pickDefaultTruongYear,
} from "@/lib/truong/year-options";
import type { SystemRole } from "@/lib/auth/system-role";
import type { TruongChiNhanh, TruongPagePayload } from "@/lib/truong/types";

const TABS = [
  { id: "bai-dang" as const, label: TRUONG_TAB_LABELS["bai-dang"], num: "01" },
  { id: "nganh" as const, label: TRUONG_TAB_LABELS.nganh, num: "02" },
  { id: "tuyen-sinh" as const, label: TRUONG_TAB_LABELS["tuyen-sinh"], num: "03" },
  { id: "hinh-anh" as const, label: TRUONG_TAB_LABELS["hinh-anh"], num: "04" },
  {
    id: "do-an-sinh-vien" as const,
    label: TRUONG_TAB_LABELS["do-an-sinh-vien"],
    num: "05",
  },
] as const satisfies ReadonlyArray<{ id: TruongTabId; label: string; num: string }>;

type Props = {
  payload: TruongPagePayload;
  canEdit?: boolean;
  /** Member org thật (trục 2) — khoá theo dõi/nhắn tin chính org của mình. */
  isOrgMember?: boolean;
  systemRole?: SystemRole | null;
};

type SettingsSavedPatch = Partial<{
  slug: string;
  ten: string;
  moTa: string | null;
  gioiThieuTruong: string | null;
  ten_tieng_anh: string | null;
  ma_truong: string | null;
  loai_truong: string | null;
  nam_thanh_lap: number | null;
  hoc_phi_nam_tu: number | null;
  hoc_phi_nam_den: number | null;
  co_ktx: boolean | null;
  ktx_gia_thang: number | null;
  ktx_dia_chi: string | null;
  chi_nhanh: TruongChiNhanh[];
  dia_chi: string | null;
  dien_thoai: string | null;
  email_lien_he: string | null;
  tinh_thanh: string | null;
  website: string | null;
  facebook: string | null;
}>;

function truongTabPrefetch(tab: TruongTabId) {
  if (tab === "bai-dang") return;
  prefetchTruongTab(tab);
}

function TruongDoanToolbarSlot({ active }: { active: boolean }) {
  const { toolbar } = useTruongDoanToolbarSlot();
  if (!active || !toolbar) return null;
  return <TruongDoanToolbar {...toolbar} embedded />;
}

function TruongDetailViewInner({
  settingsOpen = false,
  settingsSection = "identity",
  onSettingsOpenChange,
  onOpenSettings,
}: {
  settingsOpen?: boolean;
  settingsSection?: TruongSettingsSection;
  onSettingsOpenChange?: (open: boolean) => void;
  onOpenSettings?: (section: TruongSettingsSection) => void;
}) {
  const ctx = useTruongInlineEdit();
  const orgSlugEarly = ctx?.school.slug ?? "";
  const { tab, selectTab } = useTruongTabNav(orgSlugEarly);
  const [mountedTabs, setMountedTabs] = useState<Set<TruongTabId>>(
    () => new Set([tab]),
  );
  const { isMobileShell } = useCoSoMobileShell();

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  if (!ctx) return null;

  const { school, baidang, hinhanh, tuyenSinh, isEditing, cauHinhYears, canEdit } =
    ctx;
  const orgSlug = school.slug;
  const yearOptions = mergeTruongYearOptions(
    school.programs,
    tuyenSinh,
    cauHinhYears,
  );
  const initialYear = useMemo(
    () =>
      resolveInitialDisplayYear(
        school.slug,
        yearOptions,
        cauHinhYears,
        canEdit,
        pickDefaultTruongYear,
      ),
    [school.slug, yearOptions, cauHinhYears, canEdit],
  );

  const shellClass = [
    "tdh-v6-shell",
    isEditing ? "tdh-v6-shell--editing" : "",
    isMobileShell ? "tdh-v6-shell--mobile-tabs" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleSettingsSaved(patch: SettingsSavedPatch) {
    if (!ctx) return;
    ctx.applySchoolPatch({
      ...(patch.ten ? { ten: patch.ten } : {}),
      ...(patch.moTa !== undefined ? { mo_ta: patch.moTa } : {}),
      ...(patch.gioiThieuTruong !== undefined
        ? { gioi_thieu_truong: patch.gioiThieuTruong }
        : {}),
      ...(patch.ten_tieng_anh !== undefined
        ? { ten_tieng_anh: patch.ten_tieng_anh }
        : {}),
      ...(patch.ma_truong !== undefined ? { ma_truong: patch.ma_truong } : {}),
      ...(patch.loai_truong !== undefined
        ? { loai_truong: patch.loai_truong }
        : {}),
      ...(patch.nam_thanh_lap !== undefined
        ? { nam_thanh_lap: patch.nam_thanh_lap }
        : {}),
      ...(patch.hoc_phi_nam_tu !== undefined
        ? { hoc_phi_nam_tu: patch.hoc_phi_nam_tu }
        : {}),
      ...(patch.hoc_phi_nam_den !== undefined
        ? { hoc_phi_nam_den: patch.hoc_phi_nam_den }
        : {}),
      ...(patch.co_ktx !== undefined ? { co_ktx: patch.co_ktx } : {}),
      ...(patch.ktx_gia_thang !== undefined
        ? { ktx_gia_thang: patch.ktx_gia_thang }
        : {}),
      ...(patch.ktx_dia_chi !== undefined
        ? { ktx_dia_chi: patch.ktx_dia_chi }
        : {}),
      ...(patch.chi_nhanh ? { chi_nhanh: patch.chi_nhanh } : {}),
      ...(patch.dia_chi !== undefined ? { dia_chi: patch.dia_chi } : {}),
      ...(patch.dien_thoai !== undefined ? { dien_thoai: patch.dien_thoai } : {}),
      ...(patch.email_lien_he !== undefined
        ? { email_lien_he: patch.email_lien_he }
        : {}),
      ...(patch.tinh_thanh !== undefined ? { tinh_thanh: patch.tinh_thanh } : {}),
      ...(patch.website !== undefined ? { website: patch.website } : {}),
      ...(patch.facebook !== undefined ? { facebook: patch.facebook } : {}),
    });

    if (
      patch.hoc_phi_nam_tu !== undefined ||
      patch.hoc_phi_nam_den !== undefined
    ) {
      const tu =
        patch.hoc_phi_nam_tu !== undefined
          ? patch.hoc_phi_nam_tu
          : ctx.school.hoc_phi_nam_tu;
      const den =
        patch.hoc_phi_nam_den !== undefined
          ? patch.hoc_phi_nam_den
          : ctx.school.hoc_phi_nam_den;
      ctx.setStats((s) => ({
        ...s,
        hocPhiLabel: formatHocPhiLabel(tu, den),
      }));
    }
  }

  return (
    <YearFilterProvider
      yearOptions={yearOptions}
      initialYear={initialYear}
      persistPinYearSlug={canEdit ? school.slug : null}
    >
      <TruongDoanToolbarProvider>
        <div
          className={shellClass}
          data-mobile-shell={isMobileShell ? "1" : undefined}
        >
        <TruongSchoolSidebar
          onOpenSettings={onOpenSettings}
          isMobileShell={isMobileShell}
          isMobileShellActive
        />

        <div className="tdh-v6-center">
          {!isMobileShell ? (
            <div className="tdh-v6-cover-mobile">
              <TruongOrgCover school={school} editable layout="v6" />
            </div>
          ) : null}

          <div
            className={`tdh-v6-tabs-bar${
              tab === "do-an-sinh-vien" ? " tdh-v6-tabs-bar--doan" : ""
            }`}
          >
            <div
              className="tdh-v6-tabs"
              role="tablist"
              aria-label="Nội dung trường"
            >
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  href={truongTabPath(orgSlug, t.id)}
                  scroll={false}
                  role="tab"
                  aria-selected={tab === t.id}
                  id={`tdh-tab-${t.id}`}
                  aria-controls={`tdh-panel-${t.id}`}
                  className={`tdh-v6-tab${tab === t.id ? " on" : ""}`}
                  onMouseEnter={() => truongTabPrefetch(t.id)}
                  onFocus={() => truongTabPrefetch(t.id)}
                  onClick={(event) => {
                    event.preventDefault();
                    if (tab !== t.id) selectTab(t.id);
                  }}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <TruongDoanToolbarSlot active={tab === "do-an-sinh-vien"} />
          </div>

          {TABS.map((t) => {
            const isActive = tab === t.id;
            const isMounted = mountedTabs.has(t.id);
            if (!isMounted) return null;

            return (
              <div
                key={t.id}
                id={`tdh-panel-${t.id}`}
                role="tabpanel"
                aria-labelledby={`tdh-tab-${t.id}`}
                hidden={!isActive}
                className={`tdh-v6-panel${isActive ? " on" : ""}`}
              >
                {t.id === "bai-dang" ? (
                  <TruongTabBaidang posts={baidang} />
                ) : null}
                {t.id === "nganh" ? <TruongTabNganhLazy school={school} /> : null}
                {t.id === "tuyen-sinh" ? (
                  <TruongTabTuyensinhLazy school={school} tuyenSinh={tuyenSinh} />
                ) : null}
                {t.id === "hinh-anh" ? (
                  <TruongTabHinhanhLazy images={hinhanh} />
                ) : null}
                {t.id === "do-an-sinh-vien" ? <TruongTabDoanSinhVienLazy /> : null}
              </div>
            );
          })}
        </div>

        <TruongAdmissionTimelineSidebar
          isMobileShell={isMobileShell}
          isMobileShellActive
        />
      </div>

      {canEdit && onSettingsOpenChange ? (
        <TruongPageSettingsModal
          open={settingsOpen}
          orgId={school.id}
          initialSection={settingsSection}
          onClose={() => onSettingsOpenChange(false)}
          onSaved={(patch) => {
            handleSettingsSaved(patch);
            ctx.showToast("Đã cập nhật cài đặt trang.");
          }}
        />
      ) : null}
      </TruongDoanToolbarProvider>
    </YearFilterProvider>
  );
}

function TruongDetailViewBody({ payload, canEdit }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<TruongSettingsSection>("identity");

  function openSettings(section: TruongSettingsSection = "identity") {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

  return (
    <>
      <TruongAdminToolbar />
      <TruongDetailViewInner
        settingsOpen={settingsOpen}
        settingsSection={settingsSection}
        onSettingsOpenChange={canEdit ? setSettingsOpen : undefined}
        onOpenSettings={canEdit ? openSettings : undefined}
      />
    </>
  );
}

export function TruongDetailView({
  payload,
  canEdit = false,
  isOrgMember = false,
  systemRole = null,
}: Props) {
  return (
    <TruongInlineEditProvider
      canEdit={canEdit}
      isOrgMember={isOrgMember}
      systemRole={systemRole}
      initial={payload}
    >
      <TruongDetailViewBody payload={payload} canEdit={canEdit} />
    </TruongInlineEditProvider>
  );
}
