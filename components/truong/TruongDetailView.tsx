"use client";

import { useMemo, useState } from "react";

import { TruongDetailBreadcrumb } from "@/components/truong/TruongDetailBreadcrumb";
import { TruongOrgCover } from "@/components/truong/TruongOrgCover";
import { TruongAdmissionTimelineSidebar } from "@/components/truong/TruongAdmissionTimelineSidebar";
import { TruongSchoolSidebar } from "@/components/truong/TruongSchoolSidebar";
import { TruongAdminToolbar } from "@/components/truong/inline/TruongAdminToolbar";
import {
  TruongInlineEditProvider,
  useTruongInlineEdit,
} from "@/components/truong/inline/TruongInlineEditContext";
import { TruongTabBaidang } from "@/components/truong/tabs/TruongTabBaidang";
import { TruongTabDoanSinhVien } from "@/components/truong/tabs/TruongTabDoanSinhVien";
import { TruongTabHinhanh } from "@/components/truong/tabs/TruongTabHinhanh";
import { TruongTabNganh } from "@/components/truong/tabs/TruongTabNganh";
import { TruongTabTuyensinh } from "@/components/truong/tabs/TruongTabTuyensinh";
import { YearFilterProvider } from "@/components/truong/YearFilterProvider";
import { resolveInitialDisplayYear } from "@/lib/truong/pin-display-year";
import {
  mergeTruongYearOptions,
  pickMaxTruongYear,
} from "@/lib/truong/year-options";
import type { TruongPagePayload } from "@/lib/truong/types";

const TABS = [
  { id: "baidang", label: "B\u00e0i \u0111\u0103ng", num: "01" },
  { id: "nganh", label: "Ng\u00e0nh \u0111\u00e0o t\u1ea1o", num: "02" },
  { id: "tuyensinh", label: "Tuy\u1ec3n sinh", num: "03" },
  { id: "hinhanh", label: "H\u00ecnh \u1ea3nh", num: "04" },
  { id: "doan", label: "\u0110\u1ed3 \u00e1n Sinh vi\u00ean", num: "05" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  payload: TruongPagePayload;
  canEdit?: boolean;
};

export function TruongDetailView({ payload, canEdit = false }: Props) {
  return (
    <TruongInlineEditProvider canEdit={canEdit} initial={payload}>
      <TruongDetailViewInner />
    </TruongInlineEditProvider>
  );
}

function TruongDetailViewInner() {
  const ctx = useTruongInlineEdit();
  const [tab, setTab] = useState<TabId>("baidang");

  if (!ctx) return null;

  const { school, baidang, hinhanh, tuyenSinh, isEditing, cauHinhYears, canEdit } =
    ctx;
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
        pickMaxTruongYear,
      ),
    [school.slug, yearOptions, cauHinhYears, canEdit],
  );

  return (
    <YearFilterProvider
      yearOptions={yearOptions}
      initialYear={initialYear}
      persistPinYearSlug={canEdit ? school.slug : null}
    >
      <div className={`tdh-v6-shell${isEditing ? " tdh-v6-shell--editing" : ""}`}>
        <TruongSchoolSidebar />

        <div className="tdh-v6-center">
          <TruongAdminToolbar />
          <header className="center-head">
            <TruongDetailBreadcrumb schoolName={school.ten} />
          </header>

          <TruongOrgCover school={school} editable layout="v6" />

          <div className="tdh-v6-tabs-bar">
            <div
              className="tdh-v6-tabs"
              role="tablist"
              aria-label="N\u1ed9i dung tr\u01b0\u1eddng"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  id={`tdh-tab-${t.id}`}
                  aria-controls={`tdh-panel-${t.id}`}
                  className={`tdh-v6-tab${tab === t.id ? " on" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <TruongDetailPanels tab={tab} />
        </div>

        <TruongAdmissionTimelineSidebar />
      </div>
    </YearFilterProvider>
  );
}

function TruongDetailPanels({ tab }: { tab: TabId }) {
  const ctx = useTruongInlineEdit();
  if (!ctx) return null;

  const { school, baidang, hinhanh, tuyenSinh } = ctx;

  return (
    <>
      {TABS.map((t) => (
        <div
          key={t.id}
          id={`tdh-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tdh-tab-${t.id}`}
          hidden={tab !== t.id}
          className={`tdh-v6-panel${tab === t.id ? " on" : ""}`}
        >
          {t.id === "baidang" ? <TruongTabBaidang posts={baidang} /> : null}
          {t.id === "nganh" ? <TruongTabNganh school={school} /> : null}
          {t.id === "tuyensinh" ? (
            <TruongTabTuyensinh school={school} tuyenSinh={tuyenSinh} />
          ) : null}
          {t.id === "hinhanh" ? <TruongTabHinhanh images={hinhanh} /> : null}
          {t.id === "doan" ? <TruongTabDoanSinhVien /> : null}
        </div>
      ))}
    </>
  );
}
