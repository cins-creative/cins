"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { WorldJourneyFeedPromoRail } from "@/components/cins/world-journey/WorldJourneyFeedPromoRail";
import {
  JourneyYearBlock,
  timelineExpandKey,
  type TimelineInlineExpandState,
} from "@/components/journey/JourneyYearBlock";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  canWorldJourneyInlineExpandOnFeed,
} from "@/lib/cins/worldJourneyMilestoneFeed";
import {
  FEED_INLINE_PROMO_INTERVAL,
  type FeedPromoVariant,
} from "@/lib/cins/worldJourneyFeedPromosTypes";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  viewerProfileId: string;
  feedPromos?: FeedPromoVariant[];
};

/**
 * Sắp xếp feed trong 1 năm: ưu tiên nội dung CHƯA xem / xem ít
 * (`viewerSeenCount` thấp) lên trên; cùng số lượt thì theo dòng thời gian.
 */
function compareFeedUnseenThenTimeline(
  a: MilestoneItem,
  b: MilestoneItem,
): number {
  const sa = a.viewerSeenCount ?? 0;
  const sb = b.viewerSeenCount ?? 0;
  if (sa !== sb) return sa - sb;
  return compareTimelineOrder(a, b);
}

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
      milestones: items.slice().sort(compareFeedUnseenThenTimeline),
    }));
}

function milestoneOwnerSlug(milestone: MilestoneItem): string {
  return milestone.lensOwnerSlug ?? milestone.postOwnerSlug ?? "";
}

function canInlineExpand(milestone: MilestoneItem): boolean {
  return canWorldJourneyInlineExpandOnFeed(milestone);
}

// Tạm ẩn rail gợi ý xen giữa feed (WorldJourneyFeedPromoRail). Đổi `true` để bật lại.
const SHOW_FEED_PROMO_RAIL = false;

function buildPromoInsertMap(
  postCount: number,
  promos: FeedPromoVariant[],
): Map<number, ReactNode> {
  const map = new Map<number, ReactNode>();
  if (!SHOW_FEED_PROMO_RAIL || postCount === 0 || promos.length === 0) return map;

  let promoIdx = 0;
  for (
    let after = FEED_INLINE_PROMO_INTERVAL;
    after <= postCount;
    after += FEED_INLINE_PROMO_INTERVAL
  ) {
    const variant = promos[promoIdx % promos.length];
    map.set(
      after,
      <WorldJourneyFeedPromoRail
        key={`feed-promo-${promoIdx}`}
        slotKey={`${promoIdx}`}
        variant={variant}
      />,
    );
    promoIdx += 1;
  }
  return map;
}

export function WorldJourneyFeedTimeline({
  milestones,
  viewerProfileId,
  feedPromos = [],
}: Props) {
  const [inlineExpand, setInlineExpand] =
    useState<TimelineInlineExpandState>(null);

  const byYear = useMemo(() => groupByYearDesc(milestones), [milestones]);

  const promoInsertMap = useMemo(
    () => buildPromoInsertMap(milestones.length, feedPromos),
    [milestones.length, feedPromos],
  );

  const handleToggleContent = useCallback((milestone: MilestoneItem) => {
    if (!canInlineExpand(milestone)) return;

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

  let postCountOffset = 0;

  return (
    <main className="j-timeline wj-feed-timeline" aria-label="Feed World Journey">
      {byYear.map((yb) => {
        const block = (
          <JourneyYearBlock
            key={yb.year}
            year={yb.year}
            milestones={yb.milestones}
            entityLens
            analyticsNguon="journey_home"
            viewerProfileId={viewerProfileId}
            inlineExpand={inlineExpand}
            onTogglePost={handleToggleContent}
            onOpenComments={handleOpenComments}
            onCloseExpand={handleCloseExpand}
            postCountOffset={postCountOffset}
            insertAfterPostCounts={promoInsertMap}
          />
        );
        postCountOffset += yb.milestones.length;
        return block;
      })}
      <div className="j-timeline-end" aria-hidden>
        <div className="j-timeline-end-text">— hết feed mới —</div>
      </div>
    </main>
  );
}
