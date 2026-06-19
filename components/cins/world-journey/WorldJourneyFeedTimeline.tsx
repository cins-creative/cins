"use client";

import { useCallback, useMemo, useState } from "react";

import {
  JourneyYearBlock,
  timelineExpandKey,
  type TimelineInlineExpandState,
} from "@/components/journey/JourneyYearBlock";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  viewerProfileId: string;
};

function groupByYearDesc(
  milestones: ReadonlyArray<MilestoneItem>,
): Array<{ year: number; milestones: ReadonlyArray<MilestoneItem> }> {
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
      milestones: items.slice().sort(compareTimelineOrder),
    }));
}

function milestoneOwnerSlug(milestone: MilestoneItem): string {
  return milestone.lensOwnerSlug ?? milestone.postOwnerSlug ?? "";
}

function canInlineExpandArticle(milestone: MilestoneItem): boolean {
  const hasCoverPreview = Boolean(milestone.media?.[0]?.src);
  return (
    milestoneCardContentKind(milestone.noiDungBlocks, hasCoverPreview) ===
    "article"
  );
}

export function WorldJourneyFeedTimeline({
  milestones,
  viewerProfileId,
}: Props) {
  const [inlineExpand, setInlineExpand] =
    useState<TimelineInlineExpandState>(null);

  const byYear = useMemo(() => groupByYearDesc(milestones), [milestones]);

  const handleToggleContent = useCallback((milestone: MilestoneItem) => {
    if (!canInlineExpandArticle(milestone)) return;

    const ownerSlug = milestoneOwnerSlug(milestone);
    const key = timelineExpandKey(milestone, ownerSlug);
    const postOwnerSlug = milestone.postOwnerSlug ?? ownerSlug;

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
    const ownerSlug = milestoneOwnerSlug(milestone);
    const key = timelineExpandKey(milestone, ownerSlug);
    const postOwnerSlug = milestone.postOwnerSlug ?? ownerSlug;

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
    <main className="j-timeline wj-feed-timeline" aria-label="Feed World Journey">
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
      <div className="j-timeline-end" aria-hidden>
        <div className="j-timeline-end-text">— hết feed mới —</div>
      </div>
    </main>
  );
}
