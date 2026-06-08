"use client";

import { Grid3X3, Waypoints } from "lucide-react";
import { Suspense } from "react";

import { TagAggSortSelect } from "@/components/tag/TagAggSortSelect";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

export type EntityViewMode = "timeline" | "grid";

type Props = {
  workCount: number;
  sort: TagAggSort;
  view: EntityViewMode;
  onViewChange: (view: EntityViewMode) => void;
};

export function EntityLightToolbar({
  workCount,
  sort,
  view,
  onViewChange,
}: Props) {
  return (
    <div className="entity-light-bar">
      <div className="entity-light-seg" role="group" aria-label="Chế độ xem">
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
      <div className="entity-light-bar-right">
        <span className="entity-light-count">
          {workCount} tác phẩm
        </span>
        <Suspense fallback={null}>
          <TagAggSortSelect current={sort} />
        </Suspense>
      </div>
    </div>
  );
}
