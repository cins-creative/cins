"use client";

import { useState } from "react";

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
import { coSoToInlinePayload } from "@/lib/to-chuc/co-so-inline-payload";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";

const TABS = [
  { id: "bai-dang", label: CO_SO_TAB_LABELS["bai-dang"], num: "01" },
  { id: "khoa-hoc", label: CO_SO_TAB_LABELS["khoa-hoc"], num: "02" },
  { id: "san-pham", label: CO_SO_TAB_LABELS["san-pham"], num: "03" },
  { id: "hinh-anh", label: CO_SO_TAB_LABELS["hinh-anh"], num: "04" },
] as const satisfies ReadonlyArray<{ id: CoSoTabId; label: string; num: string }>;

type TabId = CoSoTabId;

type Props = {
  payload: CoSoDetailPayload;
  canEdit?: boolean;
  canManageKhoaHoc?: boolean;
  initialKhoaHoc?: KhoaHocCardData[];
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

function CoSoDetailViewInner({
  payload,
  canEdit = false,
  canManageKhoaHoc = false,
  initialKhoaHoc = [],
  settingsOpen = false,
  onSettingsOpenChange,
}: Props & {
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
}) {
  const ctx = useTruongInlineEdit();
  const [tab, setTab] = useState<TabId>("bai-dang");
  const [khoaHocMounted, setKhoaHocMounted] = useState(false);
  const [filters, setFilters] = useState(payload.filters);
  const [schoolExtra, setSchoolExtra] = useState<Partial<typeof payload.school>>({});
  const { baidang, hinhanh } = payload;
  const baseSchool = ctx?.school ?? payload.school;
  const school = { ...baseSchool, ...schoolExtra };
  const editableMedia = canEdit && Boolean(ctx?.canEdit);

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
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                id={`cso-tab-${t.id}`}
                aria-controls={`cso-panel-${t.id}`}
                className={`tdh-v6-tab${tab === t.id ? " on" : ""}`}
                onClick={() => {
                  if (t.id === "khoa-hoc") setKhoaHocMounted(true);
                  setTab(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {TABS.map((t) => (
          <div
            key={t.id}
            id={`cso-panel-${t.id}`}
            role="tabpanel"
            aria-labelledby={`cso-tab-${t.id}`}
            hidden={tab !== t.id}
            className={`tdh-v6-panel${tab === t.id ? " on" : ""}`}
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
            {t.id === "khoa-hoc" && khoaHocMounted ? (
              <CoSoTabKhoaHoc
                orgId={school.id}
                orgDiaChi={school.dia_chi}
                canManageKhoaHoc={canManageKhoaHoc}
                initialKhoaHoc={initialKhoaHoc}
              />
            ) : null}
            {t.id === "san-pham" ? (
              <CoSoTabPlaceholder
                num={t.num}
                title="Sản phẩm học viên"
                hint="Sản phẩm học viên sẽ hiện khi học viên đăng tác phẩm gắn với cơ sở."
              />
            ) : null}
            {t.id === "hinh-anh" ? <CoSoTabHinhanh images={hinhanh} /> : null}
          </div>
        ))}
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
  initialKhoaHoc,
}: {
  payload: CoSoDetailPayload;
  canManageKhoaHoc: boolean;
  initialKhoaHoc: KhoaHocCardData[];
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <CoSoAdminToolbar onOpenSettings={() => setSettingsOpen(true)} />
      <CoSoDetailViewInner
        payload={payload}
        canEdit
        canManageKhoaHoc={canManageKhoaHoc}
        initialKhoaHoc={initialKhoaHoc}
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
  initialKhoaHoc = [],
}: Props) {
  if (!canEdit) {
    return (
      <CoSoDetailViewInner
        payload={payload}
        canEdit={false}
        canManageKhoaHoc={canManageKhoaHoc}
        initialKhoaHoc={initialKhoaHoc}
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
        initialKhoaHoc={initialKhoaHoc}
      />
    </TruongInlineEditProvider>
  );
}
