"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  WORLD_JOURNEY_FEED_PREFETCH_REMAINING_POSTS,
  WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN,
} from "@/lib/cins/worldJourneyFeedConstants";
import {
  FEED_INLINE_PROMO_INTERVAL,
  FEED_PROMO_CYCLE,
  feedPromoVisibleCount,
  resolveFeedPromoBreakpoint,
  takePromoSlice,
  type FeedPromoBreakpoint,
  type FeedPromoKind,
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

function useFeedPromoBreakpoint(): FeedPromoBreakpoint {
  const [bp, setBp] = useState<FeedPromoBreakpoint>("lg");

  useEffect(() => {
    const update = () =>
      setBp(resolveFeedPromoBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}

/**
 * Chèn rail theo chu kỳ S1–S6; mỗi lần lấy slice mới từ pool (tránh lặp cùng bộ card).
 * Số card theo breakpoint — không scroll ngang.
 */
function buildPromoInsertMap(
  postCount: number,
  promos: FeedPromoVariant[],
  viewerProfileId: string,
  bp: FeedPromoBreakpoint,
): Map<number, ReactNode> {
  const map = new Map<number, ReactNode>();
  if (!SHOW_FEED_PROMO_RAIL || postCount === 0 || promos.length === 0) {
    return map;
  }

  const cursors: Partial<Record<FeedPromoKind, number>> = {};
  let cycleIdx = 0;

  for (
    let after = FEED_INLINE_PROMO_INTERVAL;
    after <= postCount;
    after += FEED_INLINE_PROMO_INTERVAL
  ) {
    let variant: FeedPromoVariant | null = null;

    for (let attempt = 0; attempt < FEED_PROMO_CYCLE.length; attempt += 1) {
      const slot = FEED_PROMO_CYCLE[cycleIdx % FEED_PROMO_CYCLE.length];
      cycleIdx += 1;
      const count = feedPromoVisibleCount(slot.kind, slot.density, bp);
      const offset = cursors[slot.kind] ?? 0;
      variant = takePromoSlice(
        promos,
        slot.kind,
        offset,
        count,
        slot.density,
      );
      if (variant) {
        cursors[slot.kind] = offset + variant.items.length;
        break;
      }
    }

    if (!variant) continue;

    map.set(
      after,
      <WorldJourneyFeedPromoRail
        key={`feed-promo-${after}-${variant.kind}-${variant.density ?? "normal"}`}
        slotKey={`${after}`}
        variant={variant}
        viewerProfileId={viewerProfileId}
      />,
    );
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
  const earlySentinelRef = useRef<HTMLDivElement>(null);
  const endSentinelRef = useRef<HTMLDivElement>(null);
  const promoBp = useFeedPromoBreakpoint();

  const byYear = useMemo(
    () => groupByYearPreserveOrder(milestones),
    [milestones],
  );

  const promoInsertMap = useMemo(
    () =>
      buildPromoInsertMap(
        milestones.length,
        feedPromos,
        viewerProfileId,
        promoBp,
      ),
    [milestones.length, feedPromos, viewerProfileId, promoBp],
  );

  /**
   * Early sentinel sau bài `length - PREFETCH` (~còn 3 bài) + giữ promo
   * cùng slot nếu trùng chu kỳ xen kẽ.
   */
  const insertAfterPostCounts = useMemo(() => {
    const map = new Map(promoInsertMap);
    if (
      !scrollLoad?.enabled ||
      milestones.length <= WORLD_JOURNEY_FEED_PREFETCH_REMAINING_POSTS
    ) {
      return map;
    }

    const after =
      milestones.length - WORLD_JOURNEY_FEED_PREFETCH_REMAINING_POSTS;
    const existing = map.get(after) ?? null;
    map.set(
      after,
      <Fragment key={`wj-feed-early-load-${after}`}>
        {existing}
        <div
          ref={earlySentinelRef}
          className="j-timeline-scroll-sentinel j-timeline-scroll-sentinel--early"
          aria-hidden
        />
      </Fragment>,
    );
    return map;
  }, [promoInsertMap, scrollLoad?.enabled, milestones.length]);

  useEffect(() => {
    if (!scrollLoad?.enabled || !onLoadMore) return;
    /* Đang xổ bài dài: sentinel dễ vào viewport → load-more đẩy feed → nhảy scroll. */
    if (inlineExpand?.showContent) return;
    if (typeof IntersectionObserver === "undefined") return;

    const nodes = [earlySentinelRef.current, endSentinelRef.current].filter(
      (node): node is HTMLDivElement => node != null,
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN,
        threshold: 0,
      },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [
    scrollLoad,
    onLoadMore,
    milestones.length,
    inlineExpand?.showContent,
    insertAfterPostCounts,
  ]);

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
            insertAfterPostCounts={insertAfterPostCounts}
          />
        );
        postCountOffset += yb.milestones.length;
        return block;
      })}

      {scrollLoad?.enabled ? (
        <div
          ref={endSentinelRef}
          className="j-timeline-scroll-sentinel"
          aria-hidden
        />
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
