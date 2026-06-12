"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  parseTruongRouteFromPathname,
  TRUONG_DEFAULT_TAB,
  TRUONG_TAB_LABELS,
  truongTabPath,
  type TruongTabId,
} from "@/lib/truong/truong-routes";
import {
  mergeTruongYearOptions,
  pickMaxTruongYear,
} from "@/lib/truong/year-options";
import type { TruongPagePayload } from "@/lib/truong/types";

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
};

function useTruongRouteTab(): TruongTabId {
  const pathname = usePathname();
  return useMemo(() => {
    return parseTruongRouteFromPathname(pathname ?? "") ?? TRUONG_DEFAULT_TAB;
  }, [pathname]);
}

export function TruongDetailView({ payload, canEdit = false }: Props) {
  return (
    <TruongInlineEditProvider canEdit={canEdit} initial={payload}>
      <TruongAdminToolbar />
      <TruongDetailViewInner />
    </TruongInlineEditProvider>
  );
}

function TruongDetailViewInner() {
  const ctx = useTruongInlineEdit();
  const tab = useTruongRouteTab();
  const [mountedTabs, setMountedTabs] = useState<Set<TruongTabId>>(
    () => new Set([tab]),
  );

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
          <div className="tdh-v6-cover-mobile">
            <TruongOrgCover school={school} editable layout="v6" />
          </div>

          <div className="tdh-v6-tabs-bar">
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
                id={`tdh-panel-${t.id}`}
                role="tabpanel"
                aria-labelledby={`tdh-tab-${t.id}`}
                hidden={!isActive}
                className={`tdh-v6-panel${isActive ? " on" : ""}`}
              >
                {t.id === "bai-dang" ? (
                  <TruongTabBaidang posts={baidang} />
                ) : null}
                {t.id === "nganh" ? <TruongTabNganh school={school} /> : null}
                {t.id === "tuyen-sinh" ? (
                  <TruongTabTuyensinh school={school} tuyenSinh={tuyenSinh} />
                ) : null}
                {t.id === "hinh-anh" ? (
                  <TruongTabHinhanh images={hinhanh} />
                ) : null}
                {t.id === "do-an-sinh-vien" ? <TruongTabDoanSinhVien /> : null}
              </div>
            );
          })}
        </div>

        <TruongAdmissionTimelineSidebar />
      </div>
    </YearFilterProvider>
  );
}
