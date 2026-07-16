"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
import { WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN } from "@/lib/cins/worldJourneyFeedConstants";
import {
  FEED_INLINE_PROMO_INTERVAL,
  type FeedPromoVariant,
} from "@/lib/cins/worldJourneyFeedPromosTypes";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  viewerProfileId: string;
  feedPromos?: FeedPromoVariant[];
  scrollLoad?: { enabled: boolean } | null;
  loadingMore?: boolean;
  loadError?: boolean;
  onLoadMore?: () => void;
};

/**
 * Nhóm milestone theo năm (mới → cũ), giữ thứ tự đã sort từ parent.
 */
function groupByYearPreserveOrder(
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
    .map(([year, items]) => ({ year, milestones: items }));
}

function milestoneOwnerSlug(milestone: MilestoneItem): string {
  return milestone.lensOwnerSlug ?? milestone.postOwnerSlug ?? "";
}

function canInlineExpand(milestone: MilestoneItem): boolean {
  return canWorldJourneyInlineExpandOnFeed(milestone);
}

/** Rail gợi ý ngang xen giữa feed (kết bạn / org / sự kiện…). */
const SHOW_FEED_PROMO_RAIL = true;

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
  scrollLoad = null,
  loadingMore = false,
  loadError = false,
  onLoadMore,
}: Props) {
  const [inlineExpand, setInlineExpand] =
    useState<TimelineInlineExpandState>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const byYear = useMemo(
    () => groupByYearPreserveOrder(milestones),
    [milestones],
  );

  const promoInsertMap = useMemo(
    () => buildPromoInsertMap(milestones.length, feedPromos),
    [milestones.length, feedPromos],
  );

  useEffect(() => {
    if (!scrollLoad?.enabled || !onLoadMore) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollLoad, onLoadMore, milestones.length]);

  const handleToggleContent = useCallback((milestone: MilestoneItem) => {
    if (!canInlineExpand(milestone)) return;

    const ownerSlug = milestoneOwnerSlug(milestone);
    const key = timelineExpandKey(milestone, ownerSlug);
    const postOwnerSlug = milestone.postOwnerSlug ?? ownerSlug;

    setInlineExpand((prev) => {
      if (prev?.key === key) {
        if (prev.showContent) {
          /* Thu gọn nội dung — giữ bình luận nếu đang mở. */
          if (prev.showComments) return { ...prev, showContent: false };
          return null;
        }
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

      {scrollLoad?.enabled ? (
        <div ref={sentinelRef} className="j-timeline-scroll-sentinel" aria-hidden />
      ) : null}

      {loadingMore ? (
        <div className="j-timeline-load-more" aria-busy="true" aria-live="polite">
          <article className="j-milestone">
            <div className="j-m-body-wrap">
              <div className="j-m-card jcard j-skel-post-card">
                <div className="jcard-datebar">
                  <div className="j-skel j-skel-post-avatar" />
                  <div className="j-skel-post-badges">
                    <div className="j-skel j-skel-post-badge" />
                  </div>
                </div>
                <div className="jcard-body">
                  <div className="j-skel j-skel-post-line j-skel-post-line--title" />
                  <div className="j-skel j-skel-post-line" />
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {loadError && onLoadMore ? (
        <div className="j-timeline-load-retry-wrap">
          <button
            type="button"
            className="j-timeline-load-retry"
            onClick={onLoadMore}
          >
            Không tải được thêm bài — thử lại
          </button>
        </div>
      ) : null}

      <div className="j-timeline-end" aria-hidden>
        <div className="j-timeline-end-text">— hết nội dung mới —</div>
      </div>
    </main>
  );
}
