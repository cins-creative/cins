"use client";

import { ChevronDown, LayoutGrid, Rows3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { OrgBaiDangCustomFilterMenuSection } from "@/components/truong/OrgBaiDangCustomFilterMenuSection";
import { useOrgBaiDangFilterOptional } from "@/components/truong/OrgBaiDangFilterContext";
import { BAI_DANG_LOAI_LABELS } from "@/lib/truong/bai-dang";
import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";
import {
  orgBaiDangTimelineFilterCount,
  type BaiDangTimelineFilter,
  type OrgBaiDangTimelineFilterKey,
} from "@/lib/truong/bai-dang-timeline";
import { orgBaiDangNhanSlugFromKey } from "@/lib/truong/org-bai-dang-filters.shared";

type Props = {
  year: number | null;
  monthLabel: string | null;
  filterKey: OrgBaiDangTimelineFilterKey;
  onFilterKeyChange: (key: OrgBaiDangTimelineFilterKey) => void;
  loaiCounts: Record<BaiDangTimelineFilter, number>;
  nhanCounts: Record<string, number>;
  enabled?: boolean;
  /** Khi truyền, hiện toggle timeline ↔ lưới (giống World Journey). */
  view?: OrgBaiDangView;
  onView?: (view: OrgBaiDangView) => void;
};

const FILTER_OPTIONS: { value: BaiDangTimelineFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "thong_bao", label: BAI_DANG_LOAI_LABELS.thong_bao },
  { value: "tuyen_sinh", label: BAI_DANG_LOAI_LABELS.tuyen_sinh },
  { value: "hoc_bong", label: BAI_DANG_LOAI_LABELS.hoc_bong },
  { value: "su_kien", label: BAI_DANG_LOAI_LABELS.su_kien },
  { value: "khac", label: BAI_DANG_LOAI_LABELS.khac },
];

export function OrgBaiDangTimelineBar({
  year,
  monthLabel,
  filterKey,
  onFilterKeyChange,
  loaiCounts,
  nhanCounts,
  enabled = true,
  view,
  onView,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const filterCtx = useOrgBaiDangFilterOptional();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const nhanSlug = orgBaiDangNhanSlugFromKey(filterKey);
  const activeLabel = nhanSlug
    ? (filterCtx?.filters.find((f) => f.slug === nhanSlug)?.ten ?? "Nhãn")
    : (FILTER_OPTIONS.find((o) => o.value === filterKey)?.label ?? "Tất cả");

  const activeCount = orgBaiDangTimelineFilterCount(
    filterKey,
    loaiCounts,
    nhanCounts,
  );

  const viewToggle =
    onView && view ? (
      <div className="org-baidang-view-toggle" role="group" aria-label="Chế độ xem">
        <button
          type="button"
          className={`obvt-btn${view === "timeline" ? " active" : ""}`}
          aria-label="Dòng thời gian"
          aria-pressed={view === "timeline"}
          title="Dòng thời gian"
          onClick={() => onView("timeline")}
        >
          <Rows3 size={15} />
        </button>
        <button
          type="button"
          className={`obvt-btn${view === "grid" ? " active" : ""}`}
          aria-label="Lưới"
          aria-pressed={view === "grid"}
          title="Lưới"
          onClick={() => onView("grid")}
        >
          <LayoutGrid size={15} />
        </button>
      </div>
    ) : null;

  const filterDropdown = (
    <div className={`j-tlb-filter${open ? " is-open" : ""}`} ref={wrapRef}>
        <button
          type="button"
          className="j-tlb-dd-btn"
          disabled={!enabled}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {activeLabel}
          <span className="j-tlb-dd-count">{activeCount}</span>
          <ChevronDown size={14} className="j-tlb-dd-caret" aria-hidden />
        </button>
        <div className="j-tlb-dd-menu" role="menu">
          <div className="j-dd-section-label">Loại bài đăng</div>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              className={
                "j-dd-opt j-dd-opt-main" +
                (filterKey === opt.value ? " is-active" : "")
              }
              onClick={() => {
                onFilterKeyChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="j-dd-lbl">{opt.label}</span>
              <span className="j-dd-n">{loaiCounts[opt.value]}</span>
            </button>
          ))}
          <OrgBaiDangCustomFilterMenuSection
            filterKey={filterKey}
            onFilterKeyChange={onFilterKeyChange}
            nhanCounts={nhanCounts}
            onItemSelect={() => setOpen(false)}
          />
        </div>
    </div>
  );

  return (
    <div className="j-tlb org-baidang-tlb">
      <div className="j-tlb-year">{year ?? "—"}</div>
      <div className="j-tlb-month">{monthLabel ?? ""}</div>
      {viewToggle ? (
        <div className="org-baidang-tlb-actions">
          {viewToggle}
          {filterDropdown}
        </div>
      ) : (
        filterDropdown
      )}
    </div>
  );
}
