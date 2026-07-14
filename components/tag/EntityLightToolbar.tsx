"use client";

import { Grid3X3, Waypoints } from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import { TagAggSortSelect } from "@/components/tag/TagAggSortSelect";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

export type EntityViewMode = "timeline" | "grid" | "masonry";

type Props = {
  workCount: number;
  sort: TagAggSort;
  view: EntityViewMode;
  onViewChange: (view: EntityViewMode) => void;
};

const VIEW_OPTIONS: ReadonlyArray<{
  id: EntityViewMode;
  label: string;
  icon: ReactNode;
}> = [
  {
    id: "timeline",
    label: "Dòng thời gian",
    icon: <Waypoints size={15} strokeWidth={2} aria-hidden />,
  },
  {
    id: "grid",
    label: "Lưới",
    icon: <Grid3X3 size={15} strokeWidth={2} aria-hidden />,
  },
  {
    id: "masonry",
    label: "Masonry",
    icon: (
      <LayoutThumbIcon
        layout="masonry"
        variant="stroke"
        size={15}
        masonryColumns={2}
      />
    ),
  },
];

export function EntityLightToolbar({
  workCount,
  sort,
  view,
  onViewChange,
}: Props) {
  return (
    <div className="entity-light-bar">
      <div className="entity-light-seg" role="group" aria-label="Chế độ xem">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={view === opt.id ? "is-on" : ""}
            aria-pressed={view === opt.id}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onViewChange(opt.id)}
          >
            {opt.icon}
          </button>
        ))}
      </div>
      <div className="entity-light-bar-right">
        <span className="entity-light-count">{workCount} tác phẩm</span>
        <Suspense fallback={null}>
          <TagAggSortSelect current={sort} />
        </Suspense>
      </div>
    </div>
  );
}
