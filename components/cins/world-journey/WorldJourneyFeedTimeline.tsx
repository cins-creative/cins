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
  WorldJourneyVideoRail,
  type VideoRailOpenPayload,
} from "@/components/cins/world-journey/WorldJourneyVideoRail";
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
  WORLD_JOURNEY_VIDEO_RAIL_SIZE,
} from "@/lib/cins/worldJourneyFeedConstants";
import { warmFeedMediaUrls } from "@/lib/journey/warm-feed-media";
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
import { takeVideoRailSlice } from "@/lib/cins/worldJourneyVideoRail";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";

type Props = {
  milestones: ReadonlyArray<MilestoneItem>;
  viewerProfileId: string;
  feedPromos?: FeedPromoVariant[];
  /** Pool video dọc — rail top + xen kẽ với promo. */
  videoRailItems?: ReadonlyArray<GalleryMainItem>;
  onOpenVideoRail?: (payload: VideoRailOpenPayload) => void;
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

/**
 * Mảng promo rỗng dùng chung — tránh tạo `[]` mới mỗi render (default param),
 * vì identity đổi sẽ làm `promoInsertMap`/`insertAfterPostCounts` tính lại →
 * IntersectionObserver bị hủy & tạo lại liên tục → prefetch mất.
 */
const EMPTY_FEED_PROMOS: FeedPromoVariant[] = [];
const EMPTY_VIDEO_RAIL: GalleryMainItem[] = [];

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
 * Chèn rail theo chu kỳ: k lẻ → promo, k chẵn → video dọc.
 * Video rail #1 (top) render riêng ngoài map (after=0).
 */
function buildFeedRailInsertMap(
  postCount: number,
  promos: FeedPromoVariant[],
  videoPool: ReadonlyArray<GalleryMainItem>,
  viewerProfileId: string,
  bp: FeedPromoBreakpoint,
  onOpenVideoRail: ((payload: VideoRailOpenPayload) => void) | undefined,
  /** Cursor sau rail top (#1) — tiếp tục slice cho rail xen kẽ. */
  videoCursorStart: number,
): Map<number, ReactNode> {
  const map = new Map<number, ReactNode>();
  if (postCount === 0) return map;

  const cursors: Partial<Record<FeedPromoKind, number>> = {};
  let cycleIdx = 0;
  let videoCursor = videoCursorStart;
  /** Số rail video đã chèn trong map (không tính top #1). */
  let videoRailSeq = 1;

  for (
    let after = FEED_INLINE_PROMO_INTERVAL, slot = 1;
    after <= postCount;
    after += FEED_INLINE_PROMO_INTERVAL, slot += 1
  ) {
    /* k lẻ → promo; k chẵn → video dọc (xen kẽ 1:1). */
    const wantVideo = slot % 2 === 0;

    if (wantVideo) {
      if (videoPool.length === 0 || !onOpenVideoRail) continue;
      const { items, nextOffset } = takeVideoRailSlice(
        videoPool,
        videoCursor,
        WORLD_JOURNEY_VIDEO_RAIL_SIZE,
      );
      if (items.length === 0) continue;
      videoCursor = nextOffset;
      videoRailSeq += 1;
      map.set(
        after,
        <WorldJourneyVideoRail
          key={`feed-video-rail-${after}`}
          items={items}
          slotKey={`${after}`}
          railIndex={videoRailSeq}
          onOpenVideo={onOpenVideoRail}
        />,
      );
      continue;
    }

    if (!SHOW_FEED_PROMO_RAIL || promos.length === 0) continue;

    let variant: FeedPromoVariant | null = null;
    for (let attempt = 0; attempt < FEED_PROMO_CYCLE.length; attempt += 1) {
      const promoSlot = FEED_PROMO_CYCLE[cycleIdx % FEED_PROMO_CYCLE.length];
      cycleIdx += 1;
      const count = feedPromoVisibleCount(
        promoSlot.kind,
        promoSlot.density,
        bp,
      );
      const offset = cursors[promoSlot.kind] ?? 0;
      variant = takePromoSlice(
        promos,
        promoSlot.kind,
        offset,
        count,
        promoSlot.density,
      );
      if (variant) {
        cursors[promoSlot.kind] = offset + variant.items.length;
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
  feedPromos = EMPTY_FEED_PROMOS,
  videoRailItems = EMPTY_VIDEO_RAIL,
  onOpenVideoRail,
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

  /* Đọc onLoadMore qua ref: identity callback đổi mỗi render không được phép
     hủy/tạo lại observer (mất callback initial async của IntersectionObserver). */
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const onOpenVideoRailRef = useRef(onOpenVideoRail);
  useEffect(() => {
    onOpenVideoRailRef.current = onOpenVideoRail;
  }, [onOpenVideoRail]);

  const openVideoRailStable = useCallback((payload: VideoRailOpenPayload) => {
    onOpenVideoRailRef.current?.(payload);
  }, []);

  const scrollLoadEnabled = scrollLoad?.enabled ?? false;

  const byYear = useMemo(
    () => groupByYearPreserveOrder(milestones),
    [milestones],
  );

  /* Warm cover + album thumbs (+ đo size vào cache) khi có data — trước khi scroll tới. */
  useEffect(() => {
    warmFeedMediaUrls(milestones);
  }, [milestones]);

  /** Rail #1 trên cùng — slice đầu pool. */
  const topVideoRail = useMemo(() => {
    if (videoRailItems.length === 0) {
      return { items: [] as GalleryMainItem[], nextOffset: 0 };
    }
    return takeVideoRailSlice(
      videoRailItems,
      0,
      WORLD_JOURNEY_VIDEO_RAIL_SIZE,
    );
  }, [videoRailItems]);

  const promoInsertMap = useMemo(
    () =>
      buildFeedRailInsertMap(
        milestones.length,
        feedPromos,
        videoRailItems,
        viewerProfileId,
        promoBp,
        videoRailItems.length > 0 ? openVideoRailStable : undefined,
        topVideoRail.nextOffset,
      ),
    [
      milestones.length,
      feedPromos,
      videoRailItems,
      viewerProfileId,
      promoBp,
      openVideoRailStable,
      topVideoRail.nextOffset,
    ],
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
    if (!scrollLoadEnabled) return;
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
          onLoadMoreRef.current?.();
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
    scrollLoadEnabled,
    milestones.length,
    inlineExpand?.showContent,
    insertAfterPostCounts,
  ]);

  /*
   * Fallback theo vị trí cuộn — bù cho IntersectionObserver trên mobile: cuộn
   * quán tính (fling) có thể "nhảy" qua sentinel 1px giữa 2 frame lấy mẫu nên
   * observer không kịp báo `isIntersecting`. Cũng lo trường hợp nội dung ngắn
   * hơn viewport (chưa đủ để cuộn). `onLoadMore` tự chặn gọi trùng/nạp khi hết,
   * nên gọi lặp là an toàn.
   */
  useEffect(() => {
    if (!scrollLoadEnabled) return;
    if (inlineExpand?.showContent) return;
    if (typeof window === "undefined") return;

    let frame = 0;
    const NEAR_BOTTOM_PX = 1000;
    const check = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollBottom = window.scrollY + window.innerHeight;
      if (doc.scrollHeight - scrollBottom <= NEAR_BOTTOM_PX) {
        onLoadMoreRef.current?.();
      }
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    /* Kiểm tra ngay sau khi render/append: fill viewport nếu còn thiếu. */
    onScroll();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scrollLoadEnabled, inlineExpand?.showContent, milestones.length]);

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
      {topVideoRail.items.length > 0 ? (
        <WorldJourneyVideoRail
          items={topVideoRail.items}
          slotKey="top"
          railIndex={1}
          onOpenVideo={openVideoRailStable}
        />
      ) : null}

      {byYear.map((yb) => {
        const block = (
          <JourneyYearBlock
            key={yb.year}
            year={yb.year}
            milestones={yb.milestones}
            entityLens
            analyticsNguon="journey_home"
            viewerProfileId={viewerProfileId}
            eagerMedia
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
