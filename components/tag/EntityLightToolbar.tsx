"use client";

import { Suspense } from "react";

import { ContentSurfaceViewToggle } from "@/components/cins/ContentSurfaceViewToggle";
import { TagAggSortSelect } from "@/components/tag/TagAggSortSelect";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

export type EntityViewMode = ContentSurfaceView;

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
      <ContentSurfaceViewToggle
        view={view}
        onViewChange={onViewChange}
        className="entity-light-seg"
        buttonClassName=""
        activeClassName="is-on"
      />
      <div className="entity-light-bar-right">
        <span className="entity-light-count">{workCount} tác phẩm</span>
        <Suspense fallback={null}>
          <TagAggSortSelect current={sort} />
        </Suspense>
      </div>
    </div>
  );
}
