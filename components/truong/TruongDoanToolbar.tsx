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
};

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
}: Props) {
  return (
    <div
      className="tdh-doan-bar"
      role="group"
      aria-label="Lọc và sắp xếp đồ án"
    >
      <div className="tdh-doan-bar-actions">
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
        <label className="tdh-doan-ctl-wrap tdh-doan-ctl-wrap--year">
          <span className="sr-only">Năm đồ án</span>
          <select
            className="tdh-doan-ctl tdh-doan-ctl--year"
            value={yearFilter}
            onChange={(e) => onYearChange(e.target.value)}
          >
            <option value="">Tất cả các năm</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                Năm {y}
              </option>
            ))}
          </select>
        </label>

        <label className="tdh-doan-ctl-wrap tdh-doan-ctl-wrap--grow">
          <span className="sr-only">Ngành đồ án</span>
          <select
            className="tdh-doan-ctl tdh-doan-ctl--nganh"
            value={nganhFilter}
            onChange={(e) => onNganhChange(e.target.value)}
          >
            <option value="">Tất cả ngành</option>
            {nganhOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
