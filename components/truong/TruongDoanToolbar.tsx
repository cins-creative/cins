"use client";

import { Grid3X3, Waypoints } from "lucide-react";

import {
  DOAN_SORT_OPTIONS,
  type DoanViewMode,
} from "@/lib/truong/doan-project-sort";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

type Props = {
  sort: TagAggSort;
  view: DoanViewMode;
  yearFilter: string;
  yearOptions: number[];
  nganhFilter: string;
  nganhOptions: string[];
  onViewChange: (view: DoanViewMode) => void;
  onSortChange: (sort: TagAggSort) => void;
  onYearChange: (year: string) => void;
  onNganhChange: (nganh: string) => void;
  embedded?: boolean;
};

function DoanViewToggle({
  view,
  onViewChange,
}: {
  view: DoanViewMode;
  onViewChange: (view: DoanViewMode) => void;
}) {
  return (
    <div className="tdh-doan-seg" role="group" aria-label="Chế độ xem">
      <button
        type="button"
        className={view === "timeline" ? "is-on" : ""}
        aria-pressed={view === "timeline"}
        aria-label="Dòng thời gian"
        title="Dòng thời gian"
        onClick={() => onViewChange("timeline")}
      >
        <Waypoints size={15} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={view === "grid" ? "is-on" : ""}
        aria-pressed={view === "grid"}
        aria-label="Lưới"
        title="Lưới"
        onClick={() => onViewChange("grid")}
      >
        <Grid3X3 size={15} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function DoanSortSelect({
  sort,
  onSortChange,
  stacked = false,
}: {
  sort: TagAggSort;
  onSortChange: (sort: TagAggSort) => void;
  stacked?: boolean;
}) {
  return (
    <label className="tdh-doan-ctl-wrap tdh-doan-ctl-wrap--sort">
      <span className={stacked ? "tdh-doan-ctl-label" : "sr-only"}>Sắp xếp</span>
      <select
        className="tdh-doan-ctl tdh-doan-ctl--sort"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as TagAggSort)}
      >
        {DOAN_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DoanFilterSelects({
  yearFilter,
  yearOptions,
  nganhFilter,
  nganhOptions,
  onYearChange,
  onNganhChange,
  showLabels = false,
  compactOptions = false,
}: Pick<
  Props,
  | "yearFilter"
  | "yearOptions"
  | "nganhFilter"
  | "nganhOptions"
  | "onYearChange"
  | "onNganhChange"
> & { showLabels?: boolean; compactOptions?: boolean }) {
  const yearLabelClass = showLabels ? "tdh-doan-ctl-label" : "sr-only";
  const nganhLabelClass = showLabels ? "tdh-doan-ctl-label" : "sr-only";
  const allYearLabel = compactOptions ? "Tất cả" : "Tất cả các năm";
  const allNganhLabel = compactOptions ? "Tất cả" : "Tất cả ngành";

  return (
    <>
      <label className="tdh-doan-ctl-wrap tdh-doan-ctl-wrap--year">
        <span className={yearLabelClass}>{showLabels ? "Năm" : "Năm đồ án"}</span>
        <select
          className="tdh-doan-ctl tdh-doan-ctl--year"
          value={yearFilter}
          onChange={(e) => onYearChange(e.target.value)}
        >
          <option value="">{allYearLabel}</option>
          {yearOptions.map((y) => (
            <option key={y} value={String(y)}>
              Năm {y}
            </option>
          ))}
        </select>
      </label>

      <label className="tdh-doan-ctl-wrap tdh-doan-ctl-wrap--grow">
        <span className={nganhLabelClass}>{showLabels ? "Ngành" : "Ngành đồ án"}</span>
        <select
          className="tdh-doan-ctl tdh-doan-ctl--nganh"
          value={nganhFilter}
          onChange={(e) => onNganhChange(e.target.value)}
        >
          <option value="">{allNganhLabel}</option>
          {nganhOptions.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function TruongDoanToolbar({
  sort,
  view,
  yearFilter,
  yearOptions,
  nganhFilter,
  nganhOptions,
  onViewChange,
  onSortChange,
  onYearChange,
  onNganhChange,
  embedded = false,
}: Props) {
  if (embedded) {
    return (
      <div
        className="tdh-doan-bar tdh-doan-bar--embedded"
        role="group"
        aria-label="Lọc và sắp xếp đồ án"
      >
        <DoanViewToggle view={view} onViewChange={onViewChange} />
        <DoanSortSelect sort={sort} onSortChange={onSortChange} stacked />
        <DoanFilterSelects
          yearFilter={yearFilter}
          yearOptions={yearOptions}
          nganhFilter={nganhFilter}
          nganhOptions={nganhOptions}
          onYearChange={onYearChange}
          onNganhChange={onNganhChange}
          showLabels
          compactOptions
        />
      </div>
    );
  }

  return (
    <div className="tdh-doan-bar" role="group" aria-label="Lọc và sắp xếp đồ án">
      <div className="tdh-doan-bar-actions">
        <DoanViewToggle view={view} onViewChange={onViewChange} />
        <div className="tdh-doan-bar-meta">
          <label className="tdh-doan-ctl-wrap tdh-doan-ctl-wrap--sort">
            <span className="sr-only">Sắp xếp đồ án</span>
            <select
              className="tdh-doan-ctl tdh-doan-ctl--sort"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as TagAggSort)}
            >
              {DOAN_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="tdh-doan-bar-filters">
        <DoanFilterSelects
          yearFilter={yearFilter}
          yearOptions={yearOptions}
          nganhFilter={nganhFilter}
          nganhOptions={nganhOptions}
          onYearChange={onYearChange}
          onNganhChange={onNganhChange}
        />
      </div>
    </div>
  );
}
