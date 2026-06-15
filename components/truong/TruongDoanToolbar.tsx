"use client";

import { Grid3X3, Waypoints } from "lucide-react";

import {
  DOAN_SORT_OPTIONS,
  type DoanViewMode,
} from "@/lib/truong/doan-project-sort";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

type Props = {
  workCount: number;
  sort: TagAggSort;
  view: DoanViewMode;
  onViewChange: (view: DoanViewMode) => void;
  onSortChange: (sort: TagAggSort) => void;
};

export function TruongDoanToolbar({
  workCount,
  sort,
  view,
  onViewChange,
  onSortChange,
}: Props) {
  const countLabel =
    workCount === 0
      ? "Không có dự án"
      : workCount === 1
        ? "1 dự án"
        : `${workCount} dự án`;

  return (
    <div className="tdh-doan-bar">
      <div className="tdh-doan-seg" role="group" aria-label="Chế độ xem">
        <button
          type="button"
          className={view === "timeline" ? "is-on" : ""}
          aria-pressed={view === "timeline"}
          onClick={() => onViewChange("timeline")}
        >
          <Waypoints size={15} strokeWidth={2} aria-hidden />
          Dòng thời gian
        </button>
        <button
          type="button"
          className={view === "grid" ? "is-on" : ""}
          aria-pressed={view === "grid"}
          onClick={() => onViewChange("grid")}
        >
          <Grid3X3 size={15} strokeWidth={2} aria-hidden />
          Lưới
        </button>
      </div>
      <div className="tdh-doan-bar-right">
        <span className="tdh-doan-bar-count">{countLabel}</span>
        <label className="tdh-doan-sort">
          <span className="sr-only">Sắp xếp đồ án</span>
          <select
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
  );
}
