"use client";

import { useEffect, useMemo, useState } from "react";

import { CoSoAdminToolbar } from "@/components/co-so/CoSoAdminToolbar";
import { CoSoTabBaidang } from "@/components/co-so/tabs/CoSoTabBaidang";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import {
  TruongInlineEditProvider,
  useTruongInlineEdit,
} from "@/components/truong/inline/TruongInlineEditContext";
import { CoSoSchoolSidebar } from "@/components/co-so/CoSoSchoolSidebar";
import { CoSoUpcomingSidebar } from "@/components/co-so/CoSoUpcomingSidebar";
import { CoSoTabHinhanh } from "@/components/co-so/tabs/CoSoTabHinhanh";
import { CoSoTabPlaceholder } from "@/components/co-so/tabs/CoSoTabPlaceholder";
import {
  isCoSoTabVisible,
  type CoSoPageCauHinh,
  type CoSoTabId,
} from "@/lib/to-chuc/co-so-page-cau-hinh";
import type { CoSoDetailPayload, CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";
import { coSoToInlinePayload } from "@/lib/to-chuc/co-so-inline-payload";

const TABS = [
  { id: "bai-dang", label: "Bài đăng", num: "01" },
  { id: "khoa-hoc", label: "Khóa học", num: "02" },
  { id: "san-pham", label: "Sản phẩm học viên", num: "03" },
  { id: "hinh-anh", label: "Hình ảnh", num: "04" },
] as const satisfies ReadonlyArray<{ id: CoSoTabId; label: string; num: string }>;

type TabId = CoSoTabId;

type Props = {
  payload: CoSoDetailPayload;
  canEdit?: boolean;
};

type SettingsSavedPatch = {
  slug?: string;
  ten?: string;
  pageConfig: CoSoPageCauHinh;
  filters: CoSoFilterChip[];
  loaiCoSo?: string;
  namThanhLap?: number | null;
  giayPhepDaoTao?: string | null;
};

function CoSoDetailViewInner({ payload, canEdit = false }: Props) {
  const ctx = useTruongInlineEdit();
  const [tab, setTab] = useState<TabId>("bai-dang");
  const [pageConfig, setPageConfig] = useState(payload.pageConfig);
  const [filters, setFilters] = useState(payload.filters);
  const [schoolExtra, setSchoolExtra] = useState<Partial<typeof payload.school>>({});
  const { baidang, hinhanh } = payload;
  const baseSchool = ctx?.school ?? payload.school;
  const school = { ...baseSchool, ...schoolExtra };
  const editableMedia = canEdit && Boolean(ctx?.canEdit);

  const visibleTabs = useMemo(
    () => TABS.filter((t) => isCoSoTabVisible(t.id, pageConfig)),
    [pageConfig],
  );

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? "bai-dang");
    }
  }, [visibleTabs, tab]);

  const shellClass = `tdh-v6-shell${ctx?.isEditing ? " tdh-v6-shell--editing" : ""}`;

  function handleSettingsSaved(patch: SettingsSavedPatch) {
    setPageConfig(patch.pageConfig);
    setFilters(patch.filters);
    setSchoolExtra((prev) => ({
      ...prev,
      ...(patch.ten ? { ten: patch.ten } : {}),
      ...(patch.loaiCoSo ? { loai_truong: patch.loaiCoSo } : {}),
      ...(patch.namThanhLap !== undefined
        ? { nam_thanh_lap: patch.namThanhLap }
        : {}),
      ...(patch.giayPhepDaoTao !== undefined
        ? { giay_phep_dao_tao: patch.giayPhepDaoTao }
        : {}),
    }));
  }

  return (
    <div className={shellClass}>
      <CoSoSchoolSidebar
        school={school}
        canEditMedia={canEdit}
        onSettingsSaved={handleSettingsSaved}
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
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                id={`cso-tab-${t.id}`}
                aria-controls={`cso-panel-${t.id}`}
                className={`tdh-v6-tab${tab === t.id ? " on" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {visibleTabs.map((t) => (
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
            {t.id === "khoa-hoc" ? (
              <CoSoTabPlaceholder
                num={t.num}
                title="Khóa học"
                hint="Tạo khóa học đầu tiên để học viên có thể đăng ký."
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
  );
}

export function CoSoDetailView({ payload, canEdit = false }: Props) {
  if (!canEdit) {
    return <CoSoDetailViewInner payload={payload} canEdit={false} />;
  }

  return (
    <TruongInlineEditProvider
      canEdit
      initial={coSoToInlinePayload(payload)}
    >
      <CoSoAdminToolbar />
      <CoSoDetailViewInner payload={payload} canEdit />
    </TruongInlineEditProvider>
  );
}
