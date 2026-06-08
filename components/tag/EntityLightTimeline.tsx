"use client";

import { useCallback, useMemo, useState } from "react";

import { EntityLightGrid } from "@/components/tag/EntityLightGrid";
import {
  EntityLightToolbar,
  type EntityViewMode,
} from "@/components/tag/EntityLightToolbar";
import { JourneyMilestoneCard } from "@/components/journey/JourneyMilestoneCard";
import {
  JourneyYearBlock,
  timelineExpandKey,
  type TimelineInlineExpandState,
} from "@/components/journey/JourneyYearBlock";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { milestoneContentKind } from "@/lib/journey/post-media";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  sort: TagAggSort;
  viewerProfileId: string | null;
};

function groupByYearDesc(
  milestones: ReadonlyArray<MilestoneItem>,
): Array<{ year: number; milestones: MilestoneItem[] }> {
  const map = new Map<number, MilestoneItem[]>();
  for (const m of milestones) {
    const arr = map.get(m.year) ?? [];
    arr.push(m);
    map.set(m.year, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({
      year,
      milestones:
        items.length > 1
          ? items.slice().sort(compareTimelineOrder)
          : items.slice(),
    }));
}

export function EntityLightTimeline({
  milestones,
  sort,
  viewerProfileId,
}: Props) {
  const [view, setView] = useState<EntityViewMode>("timeline");
  const [inlineExpand, setInlineExpand] = useState<TimelineInlineExpandState>(
    null,
  );

  const byYear = useMemo(
    () => (sort === "moi_nhat" ? groupByYearDesc(milestones) : []),
    [milestones, sort],
  );

  const handleToggleContent = useCallback((milestone: MilestoneItem) => {
    if (milestoneContentKind(milestone.noiDungBlocks) !== "article") return;
    const key = timelineExpandKey(
      milestone,
      milestone.lensOwnerSlug ?? milestone.postOwnerSlug ?? "",
    );
    const postOwnerSlug =
      milestone.postOwnerSlug ?? milestone.lensOwnerSlug ?? "";
    setInlineExpand((prev) => {
      if (prev?.key === key) {
        if (prev.showContent) return null;
        return { ...prev, showContent: true };
      }
      return {
        key,
        postOwnerSlug,
        showContent: true,
        showComments: false,
      };
    });
  }, []);

  const handleOpenComments = useCallback((milestone: MilestoneItem) => {
    const key = timelineExpandKey(
      milestone,
      milestone.lensOwnerSlug ?? milestone.postOwnerSlug ?? "",
    );
    const postOwnerSlug =
      milestone.postOwnerSlug ?? milestone.lensOwnerSlug ?? "";
    setInlineExpand((prev) => {
      if (prev?.key === key) {
        if (prev.showComments) {
          if (!prev.showContent) return null;
          return { ...prev, showComments: false };
        }
        return { ...prev, showComments: true };
      }
      return {
        key,
        postOwnerSlug,
        showContent: false,
        showComments: true,
      };
    });
  }, []);

  const handleCloseExpand = useCallback(() => setInlineExpand(null), []);

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
      ) : sort === "moi_nhat" ? (
        <div className="cins-journey-page entity-light-journey">
          <div className="j-shell entity-light-shell">
            <main className="j-timeline entity-light-feed" aria-label="Dòng thời gian">
              {byYear.map((yb) => (
                <JourneyYearBlock
                  key={yb.year}
                  year={yb.year}
                  milestones={yb.milestones}
                  entityLens
                  viewerProfileId={viewerProfileId}
                  inlineExpand={inlineExpand}
                  onTogglePost={handleToggleContent}
                  onOpenComments={handleOpenComments}
                  onCloseExpand={handleCloseExpand}
                />
              ))}
            </main>
          </div>
        </div>
      ) : (
        <div className="cins-journey-page entity-light-journey">
          <div className="j-shell entity-light-shell">
            <main className="j-timeline entity-light-feed" aria-label="Dòng thời gian">
              <section className="j-year-block entity-light-flat">
                {milestones.map((m) => {
                  const slug = m.lensOwnerSlug ?? m.postOwnerSlug ?? "";
                  const expandKey = timelineExpandKey(m, slug);
                  const isActive = inlineExpand?.key === expandKey;
                  const isOwner =
                    viewerProfileId != null &&
                    m.lensOwnerId != null &&
                    viewerProfileId === m.lensOwnerId;
                  return (
                    <JourneyMilestoneCard
                      key={m.id}
                      milestone={m}
                      isOwner={isOwner}
                      ownerSlug={slug}
                      ownerProfileId={m.lensOwnerId ?? undefined}
                      viewerProfileId={viewerProfileId}
                      authorAvatarUrl={m.lensOwnerAvatarUrl ?? null}
                      authorName={m.lensOwnerName ?? null}
                      entityLens
                      inlineExpand={{
                        showContent:
                          isActive && Boolean(inlineExpand?.showContent),
                        showComments:
                          isActive && Boolean(inlineExpand?.showComments),
                        postOwnerSlug:
                          m.postOwnerSlug ?? m.lensOwnerSlug ?? slug,
                        onToggleContent: () => handleToggleContent(m),
                        onOpenComments: () => handleOpenComments(m),
                        onClose: handleCloseExpand,
                      }}
                    />
                  );
                })}
              </section>
            </main>
          </div>
        </div>
      )}
    </section>
  );
}
