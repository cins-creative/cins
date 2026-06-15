"use client";

import { useState } from "react";

import { EntityLightGrid } from "@/components/tag/EntityLightGrid";
import { EntityLightJourneyFeed } from "@/components/tag/EntityLightJourneyFeed";
import {
  EntityLightToolbar,
  type EntityViewMode,
} from "@/components/tag/EntityLightToolbar";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  sort: TagAggSort;
  viewerProfileId: string | null;
};

export function EntityLightTimeline({
  milestones,
  sort,
  viewerProfileId,
}: Props) {
  const [view, setView] = useState<EntityViewMode>("timeline");

  return (
    <section className="entity-light-works" aria-label="Tác phẩm gắn tag">
      <EntityLightToolbar
        workCount={milestones.length}
        sort={sort}
        view={view}
        onViewChange={setView}
      />

      {milestones.length === 0 ? (
        <p className="entity-light-empty">Chưa có tác phẩm nào gắn tag này.</p>
      ) : view === "grid" ? (
        <EntityLightGrid milestones={milestones} />
      ) : (
        <EntityLightJourneyFeed
          milestones={milestones}
          sort={sort}
          viewerProfileId={viewerProfileId}
        />
      )}
    </section>
  );
}
