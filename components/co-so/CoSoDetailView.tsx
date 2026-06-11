"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CoSoAdminToolbar } from "@/components/co-so/CoSoAdminToolbar";
import { CoSoPageSettingsModal } from "@/components/co-so/CoSoPageSettingsModal";
import { CoSoTabBaidang } from "@/components/co-so/tabs/CoSoTabBaidang";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import {
  TruongInlineEditProvider,
  useTruongInlineEdit,
} from "@/components/truong/inline/TruongInlineEditContext";
import { CoSoSchoolSidebar } from "@/components/co-so/CoSoSchoolSidebar";
import { CoSoUpcomingSidebar } from "@/components/co-so/CoSoUpcomingSidebar";
import { CoSoTabHinhanh } from "@/components/co-so/tabs/CoSoTabHinhanh";
import { CoSoTabKhoaHoc } from "@/components/co-so/tabs/CoSoTabKhoaHoc";
import { CoSoTabPlaceholder } from "@/components/co-so/tabs/CoSoTabPlaceholder";
import {
  CO_SO_TAB_LABELS,
  type CoSoTabId,
} from "@/lib/to-chuc/co-so-page-cau-hinh";
import type { CoSoDetailPayload, CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";
import {
  CO_SO_DEFAULT_TAB,
  coSoTabPath,
  parseCoSoRouteFromPathname,
} from "@/lib/to-chuc/co-so-routes";
import { coSoToInlinePayload } from "@/lib/to-chuc/co-so-inline-payload";

const TABS = [
  { id: "bai-dang", label: CO_SO_TAB_LABELS["bai-dang"], num: "01" },
  { id: "khoa-hoc", label: CO_SO_TAB_LABELS["khoa-hoc"], num: "02" },
  { id: "san-pham", label: CO_SO_TAB_LABELS["san-pham"], num: "03" },
  { id: "hinh-anh", label: CO_SO_TAB_LABELS["hinh-anh"], num: "04" },
] as const satisfies ReadonlyArray<{ id: CoSoTabId; label: string; num: string }>;

type Props = {
  payload: CoSoDetailPayload;
  canEdit?: boolean;
  canManageKhoaHoc?: boolean;
};

type SettingsSavedPatch = {
  slug?: string;
  ten?: string;
  filters?: CoSoFilterChip[];
  loaiCoSo?: string;
  namThanhLap?: number | null;
  giayPhepDaoTao?: string | null;
  moTa?: string | null;
  diaChi?: string | null;
  dienThoai?: string | null;
  emailLienHe?: string | null;
  tinhThanh?: string | null;
  website?: string | null;
};

function useCoSoRouteState() {
  const pathname = usePathname();
  return useMemo(() => {
    const parsed = parseCoSoRouteFromPathname(pathname ?? "");
    return parsed ?? { tab: CO_SO_DEFAULT_TAB, khoaSlug: null };
  }, [pathname]);
}

function CoSoDetailViewInner({
  payload,
  canEdit = false,
  canManageKhoaHoc = false,
  settingsOpen = false,
  onSettingsOpenChange,
}: Props & {
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
}) {
  const ctx = useTruongInlineEdit();
  const [filters, setFilters] = useState(payload.filters);
  const [schoolExtra, setSchoolExtra] = useState<Partial<typeof payload.school>>({});
  const { baidang, hinhanh } = payload;
  const baseSchool = ctx?.school ?? payload.school;
  const school = { ...baseSchool, ...schoolExtra };
  const orgSlug = school.slug;
  const { tab, khoaSlug } = useCoSoRouteState();
  const [mountedTabs, setMountedTabs] = useState<Set<CoSoTabId>>(
    () => new Set([tab]),
  );
  const editableMedia = canEdit && Boolean(ctx?.canEdit);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  const shellClass = `tdh-v6-shell${ctx?.isEditing ? " tdh-v6-shell--editing" : ""}`;

  function handleSettingsSaved(patch: SettingsSavedPatch) {
    if (patch.filters) setFilters(patch.filters);
    setSchoolExtra((prev) => ({
      ...prev,
      ...(patch.ten ? { ten: patch.ten } : {}),
      ...(patch.moTa !== undefined ? { mo_ta: patch.moTa } : {}),
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
    }));
  }

  return (
    <>
      <div className={shellClass}>
      <CoSoSchoolSidebar
        school={school}
        loaiCoSoLabel={payload.loaiCoSoLabel}
        daVerify={payload.daVerify}
        canEditMedia={canEdit}
      />

      <div className="tdh-v6-center">
        <div className="tdh-v6-cover-mobile">
          <TruongOrgCover
            school={school}
            layout="v6"
            editable={editableMedia}
          />
        </div>

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
              >
                {t.label}
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
                <CoSoTabKhoaHoc
                  orgId={school.id}
                  orgSlug={orgSlug}
                  orgTen={school.ten}
                  orgDiaChi={school.dia_chi}
                  canManageKhoaHoc={canManageKhoaHoc}
                  khoaSlug={khoaSlug}
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
                <CoSoTabHinhanh images={hinhanh} />
              ) : null}
            </div>
          );
        })}
      </div>

      <CoSoUpcomingSidebar />
      </div>

      {canEdit && onSettingsOpenChange ? (
        <CoSoPageSettingsModal
          open={settingsOpen}
          orgId={school.id}
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

function CoSoEditableShell({
  payload,
  canManageKhoaHoc,
}: {
  payload: CoSoDetailPayload;
  canManageKhoaHoc: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <CoSoAdminToolbar onOpenSettings={() => setSettingsOpen(true)} />
      <CoSoDetailViewInner
        payload={payload}
        canEdit
        canManageKhoaHoc={canManageKhoaHoc}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
      />
    </>
  );
}

export function CoSoDetailView({
  payload,
  canEdit = false,
  canManageKhoaHoc = false,
}: Props) {
  if (!canEdit) {
    return (
      <CoSoDetailViewInner
        payload={payload}
        canEdit={false}
        canManageKhoaHoc={canManageKhoaHoc}
      />
    );
  }

  return (
    <TruongInlineEditProvider
      canEdit
      initial={coSoToInlinePayload(payload)}
    >
      <CoSoEditableShell
        payload={payload}
        canManageKhoaHoc={canManageKhoaHoc}
      />
    </TruongInlineEditProvider>
  );
}
