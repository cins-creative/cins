"use client";

import { LayoutGrid, Search, Sparkles, Waypoints } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { WorldJourneyFeedTimeline } from "@/components/cins/world-journey/WorldJourneyFeedTimeline";
import { WorldJourneyGuestLeftAside } from "@/components/cins/world-journey/WorldJourneyGuestLeftAside";
import { WorldJourneyGuestRightAside } from "@/components/cins/world-journey/WorldJourneyGuestRightAside";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyGalleryGridView } from "@/components/journey/JourneyGalleryGridView";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import { OrgNotifyFabHost } from "@/components/org/OrgNotifyFab";
import {
  buildWorldJourneyFeedQuery,
  findWorldJourneyFilterChip,
  worldJourneyMilestoneMatchesFilter,
  worldJourneyMilestoneMatchesLinhVuc,
  WORLD_JOURNEY_SORT_OPTIONS,
  type WjFilterChip,
} from "@/lib/cins/worldJourneyFeedFilters";
import {
  WORLD_JOURNEY_FEED_PAGE_SIZE,
  WORLD_JOURNEY_FIRST_IMPRESSION_CAP,
  WORLD_JOURNEY_GALLERY_PAGE_SIZE,
  WORLD_JOURNEY_OWN_PUBLISH_PIN_MS,
} from "@/lib/cins/worldJourneyFeedConstants";
import {
  applyWorldJourneyFirstImpressionPin,
  sortWorldJourneyMilestones,
} from "@/lib/cins/worldJourneyFeedSort";
import {
  markWorldJourneyFirstImpressionSeen,
  readWorldJourneyFirstImpressionSeen,
  worldJourneyMilestonePinKey,
} from "@/lib/cins/worldJourneyFirstImpression";
import {
  FEED_SOURCE_CHANGE_EVENT,
  FEED_SOURCE_DEFAULT,
  matchesFeedSource,
  readFeedSourceDefault,
  type FeedSourceFilter,
} from "@/lib/cins/worldJourneyFeedSource";
import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  COMPOSE_PUBLISHED_EVENT,
  type ComposePublishedDetail,
} from "@/lib/journey/compose-published-sync";
import {
  HOME_FEED_LAYOUT_CHANGE_EVENT,
  readHomeFeedLayout,
  type HomeFeedLayout,
} from "@/lib/home/home-feed-layout";
import { mergeMilestoneIntoTimeline } from "@/lib/journey/timeline-merge";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
/* Inline unfold + bình luận dùng `.cins-post-view` — cùng CSS với journey layout / modal. */
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";
import "@/app/org-notify-fab.css";
import "@/app/world-journey-feed.css";

type FeedSurfaceView = "journey" | "gallery";

function feedViewFromSearch(search: string): FeedSurfaceView {
  return new URLSearchParams(search).get("view") === "gallery"
    ? "gallery"
    : "journey";
}

function surfaceFromLayout(layout: HomeFeedLayout): FeedSurfaceView {
  return layout === "masonry" ? "gallery" : "journey";
}

/**
 * Bố cục mở đầu: URL `?view=` thắng (link chia sẻ / back-forward), nếu không có
 * thì dùng lựa chọn bố cục trang chủ đã lưu trong cài đặt (timeline / masonry).
 */
function initialSurfaceView(search: string): FeedSurfaceView {
  const params = new URLSearchParams(search);
  if (params.has("view")) {
    return params.get("view") === "gallery" ? "gallery" : "journey";
  }
  return surfaceFromLayout(readHomeFeedLayout());
}

function feedViewHref(view: FeedSurfaceView): string {
  if (typeof window === "undefined") {
    return view === "gallery" ? "/?view=gallery" : "/";
  }
  const url = new URL(window.location.href);
  if (view === "gallery") url.searchParams.set("view", "gallery");
  else url.searchParams.delete("view");
  const q = url.searchParams.toString();
  return q ? `${url.pathname}?${q}` : url.pathname;
}

function WorldJourneyFilterBar({
  surfaceView,
  onSurfaceView,
}: {
  surfaceView: FeedSurfaceView;
  onSurfaceView: (view: FeedSurfaceView) => void;
}) {
  return (
    <div className="wj-filter-bar">
      {/* Mobile/tablet: briefcase + lịch — mép trái. Desktop ≥1200px ẩn. */}
      <div className="wj-filter-trail-start">
        <OrgNotifyFabHost slot="jobs" className="wj-notify-fab-host" />
        <OrgNotifyFabHost slot="notify" className="wj-notify-fab-host" />
      </div>
      <span className="wj-filter-spacer" />
      <div className="wj-filter-trail">
        <div className="wj-view-toggle" role="group" aria-label="Chế độ xem">
          <button
            type="button"
            className={`wj-vt-btn${surfaceView === "journey" ? " active" : ""}`}
            aria-label="Dòng thời gian"
            aria-pressed={surfaceView === "journey"}
            title={
              surfaceView === "journey"
                ? "Cuộn lên đầu và tải nội dung mới"
                : "Dòng thời gian"
            }
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceView("journey");
            }}
          >
            <Waypoints size={15} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={`wj-vt-btn${surfaceView === "gallery" ? " active" : ""}`}
            aria-label="Gallery"
            aria-pressed={surfaceView === "gallery"}
            title={
              surfaceView === "gallery"
                ? "Cuộn lên đầu và tải nội dung mới"
                : "Gallery"
            }
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceView("gallery");
            }}
          >
            <LayoutGrid size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function WorldJourneyFilterSearching({
  surface,
}: {
  surface: "gallery" | "feed";
}) {
  const isGallery = surface === "gallery";
  return (
    <div
      className="wj-feed-empty wj-feed-searching"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="wj-feed-searching-visual" aria-hidden>
        <div className="wj-feed-searching-grid">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <div className="wj-feed-searching-lens">
          <Search size={18} strokeWidth={2.2} />
          <span className="wj-feed-searching-beam" />
        </div>
      </div>
      <b>
        {isGallery ? "Đang tìm gallery theo bộ lọc…" : "Đang tìm theo bộ lọc…"}
      </b>
      <p>
        {isGallery
          ? "Đang query lại các ô khớp bộ lọc đã chọn."
          : "đang tìm kiếm nội dung phù hợp"}
      </p>
      <div className="wj-feed-searching-dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function WorldJourneyFeed({
  sidebarProfile,
  viewerProfileId,
  filterChips,
  linhVucs,
  milestones,
  feedHasMore = false,
  feedNextOffset = milestones.length,
  galleryItems = [],
  galleryHasMore = false,
  galleryNextOffset = 0,
  leftAside,
  rightAside,
  pendingConfirmations,
  feedPromos,
}: {
  sidebarProfile: SidebarProfile;
  viewerProfileId: string;
  filterChips: WjFilterChip[];
  linhVucs: WjLinhVucAsideItem[];
  milestones: MilestoneItem[];
  feedHasMore?: boolean;
  feedNextOffset?: number;
  galleryItems?: ReadonlyArray<GalleryMainItem>;
  galleryHasMore?: boolean;
  galleryNextOffset?: number;
  leftAside?: ReactNode;
  rightAside?: ReactNode;
  /** Banner "việc cần xác nhận" — hiện đầu cột feed để user chú ý. */
  pendingConfirmations?: ReactNode;
  feedPromos?: FeedPromoVariant[];
}) {
  const [surfaceView, setSurfaceView] = useState<FeedSurfaceView>("journey");
  /** Loại nội dung cố định «Tất cả» — UI lọc đã gỡ. */
  const activeFilter = "all";
  const [feedSource, setFeedSource] =
    useState<FeedSourceFilter>(FEED_SOURCE_DEFAULT);
  const [activeLinhVucSlug, setActiveLinhVucSlug] = useState<string | null>(
    null,
  );
  /** Sắp xếp cố định «Mới nhất» — UI sort đã gỡ. */
  const sort = WORLD_JOURNEY_SORT_OPTIONS[0];
  const [feedMilestones, setFeedMilestones] = useState(milestones);
  const [hasMore, setHasMore] = useState(feedHasMore);
  const [nextOffset, setNextOffset] = useState(feedNextOffset);
  const [galleryRows, setGalleryRows] = useState(galleryItems);
  const [galleryMore, setGalleryMore] = useState(galleryHasMore);
  const [galleryOffset, setGalleryOffset] = useState(galleryNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  /** Tăng khi user tap header / tab đang chọn → fetch lại từ đầu. */
  const [refreshNonce, setRefreshNonce] = useState(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(feedHasMore);
  const nextOffsetRef = useRef(feedNextOffset);
  const filterQueryEpochRef = useRef(0);
  const skipInitialFilterFetchRef = useRef(true);
  const surfaceViewRef = useRef(surfaceView);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    nextOffsetRef.current = nextOffset;
  }, [nextOffset]);

  useEffect(() => {
    surfaceViewRef.current = surfaceView;
  }, [surfaceView]);

  const reloadFromTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    setRefreshNonce((n) => n + 1);
  }, []);

  const handleSurfaceView = useCallback(
    (next: FeedSurfaceView) => {
      if (surfaceViewRef.current === next) {
        reloadFromTop();
        return;
      }
      setSurfaceView(next);
      window.history.pushState({ wjView: next }, "", feedViewHref(next));
    },
    [reloadFromTop],
  );

  const handleFeedHeaderClick = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          "button, a, input, textarea, select, [role='menu'], [role='menuitem']",
        )
      ) {
        return;
      }
      reloadFromTop();
    },
    [reloadFromTop],
  );

  useEffect(() => {
    setSurfaceView(initialSurfaceView(window.location.search));
    const onPop = () => {
      setSurfaceView(feedViewFromSearch(window.location.search));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Nguồn nội dung: mở đầu theo mặc định đã lưu (cài đặt → Bố cục → Trang chủ),
  // và đổi ngay khi mặc định thay đổi trong cài đặt cùng tab.
  useEffect(() => {
    setFeedSource(readFeedSourceDefault());
    const onSourceChange = (event: Event) => {
      setFeedSource((event as CustomEvent<FeedSourceFilter>).detail);
    };
    window.addEventListener(FEED_SOURCE_CHANGE_EVENT, onSourceChange);
    return () =>
      window.removeEventListener(FEED_SOURCE_CHANGE_EVENT, onSourceChange);
  }, []);

  // Đổi bố cục trong cài đặt → áp ngay cho feed đang mở (đồng bộ cả URL).
  useEffect(() => {
    const onLayoutChange = (event: Event) => {
      const layout = (event as CustomEvent<HomeFeedLayout>).detail;
      handleSurfaceView(surfaceFromLayout(layout));
    };
    window.addEventListener(HOME_FEED_LAYOUT_CHANGE_EVENT, onLayoutChange);
    return () =>
      window.removeEventListener(HOME_FEED_LAYOUT_CHANGE_EVENT, onLayoutChange);
  }, [handleSurfaceView]);

  /**
   * Bài vừa compose — giữ trong RAM khi SSR/cache chưa kịp.
   * Không sống qua F5; first-impression session pin lo lần đầu / sau reload.
   */
  const pinnedOwnPublishRef = useRef<
    Map<string, { milestone: MilestoneItem; expiresAt: number }>
  >(new Map());

  const mergePinnedOwnPublishes = useCallback(
    (base: ReadonlyArray<MilestoneItem>): MilestoneItem[] => {
      const now = Date.now();
      const pinned = pinnedOwnPublishRef.current;
      for (const [key, entry] of [...pinned.entries()]) {
        if (entry.expiresAt <= now) pinned.delete(key);
      }
      let next = base.slice();
      for (const entry of pinned.values()) {
        next = mergeMilestoneIntoTimeline(next, entry.milestone);
      }
      return next;
    },
    [],
  );

  /** Đưa bài compose vừa đăng lên trước list đã sort (RAM only). */
  const prependPinnedOwnPublishes = useCallback(
    (items: ReadonlyArray<MilestoneItem>): MilestoneItem[] => {
      const now = Date.now();
      const pinned = pinnedOwnPublishRef.current;
      const active: MilestoneItem[] = [];
      for (const [key, entry] of [...pinned.entries()]) {
        if (entry.expiresAt <= now) {
          pinned.delete(key);
          continue;
        }
        active.push(entry.milestone);
      }
      if (active.length === 0) return items.slice();
      const keys = new Set(active.map(worldJourneyMilestonePinKey));
      return active.concat(
        items.filter((m) => !keys.has(worldJourneyMilestonePinKey(m))),
      );
    },
    [],
  );

  useEffect(() => {
    /* Không ghi đè kết quả query filter bằng props SSR trang đầu. */
    if (
      filterLoading ||
      activeFilter !== "all" ||
      activeLinhVucSlug ||
      feedSource !== FEED_SOURCE_DEFAULT
    ) {
      return;
    }
    setFeedMilestones(mergePinnedOwnPublishes(milestones));
    setHasMore(feedHasMore);
    setNextOffset(feedNextOffset);
    hasMoreRef.current = feedHasMore;
    nextOffsetRef.current = feedNextOffset;
    setGalleryRows(galleryItems);
    setGalleryMore(galleryHasMore);
    setGalleryOffset(galleryNextOffset);
  }, [
    milestones,
    feedHasMore,
    feedNextOffset,
    galleryItems,
    galleryHasMore,
    galleryNextOffset,
    filterLoading,
    activeFilter,
    activeLinhVucSlug,
    feedSource,
    mergePinnedOwnPublishes,
  ]);

  useEffect(() => {
    const onComposePublished = (event: Event) => {
      const detail = (event as CustomEvent<ComposePublishedDetail>).detail;
      if (!detail?.ownerSlug || detail.ownerSlug !== sidebarProfile.slug)
        return;
      if (!detail.milestone) return;
      const milestone: MilestoneItem = {
        ...detail.milestone,
        postOwnerId:
          detail.milestone.postOwnerId ??
          detail.ownerProfileId ??
          viewerProfileId,
        lensOwnerId:
          detail.milestone.lensOwnerId ??
          detail.ownerProfileId ??
          viewerProfileId,
        /* World feed entityLens cần slug/tên/avatar — buildSelf không gắn. */
        postOwnerSlug:
          detail.milestone.postOwnerSlug ?? detail.ownerSlug ?? sidebarProfile.slug,
        lensOwnerSlug:
          detail.milestone.lensOwnerSlug ??
          detail.ownerSlug ??
          sidebarProfile.slug,
        lensOwnerName:
          detail.milestone.lensOwnerName ??
          sidebarProfile.tenHienThi ??
          detail.ownerSlug ??
          sidebarProfile.slug,
        lensOwnerAvatarUrl:
          detail.milestone.lensOwnerAvatarUrl ??
          sidebarProfile.avatarUrl ??
          null,
      };
      const pinKey = worldJourneyMilestonePinKey(milestone);
      pinnedOwnPublishRef.current.set(pinKey, {
        milestone,
        expiresAt: Date.now() + WORLD_JOURNEY_OWN_PUBLISH_PIN_MS,
      });
      /* Đã thấy bài mình → F5 không first-impression lại. */
      markWorldJourneyFirstImpressionSeen(viewerProfileId, [pinKey]);
      if (!liveFirstImpressionIdsRef.current.includes(pinKey)) {
        liveFirstImpressionIdsRef.current = [
          pinKey,
          ...liveFirstImpressionIdsRef.current,
        ].slice(0, WORLD_JOURNEY_FIRST_IMPRESSION_CAP);
      }
      liveFirstImpressionResolvedRef.current = true;
      setFeedMilestones((prev) => mergeMilestoneIntoTimeline(prev, milestone));
    };
    const onMilestoneDeleted = (event: Event) => {
      const detail = (event as CustomEvent<{ milestoneId?: string }>).detail;
      const id = detail?.milestoneId?.trim();
      if (!id) return;
      pinnedOwnPublishRef.current.delete(id);
      setFeedMilestones((prev) =>
        prev.filter((m) => m.id !== id && m.cotMocId !== id),
      );
    };
    window.addEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
    window.addEventListener("cins:milestone-deleted", onMilestoneDeleted);
    return () => {
      window.removeEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
      window.removeEventListener("cins:milestone-deleted", onMilestoneDeleted);
    };
  }, [sidebarProfile.slug, sidebarProfile.tenHienThi, sidebarProfile.avatarUrl, viewerProfileId]);

  const activeChip = findWorldJourneyFilterChip(filterChips, activeFilter);
  const exploreIds = useMemo(
    () => new Set(feedMilestones.filter((m) => m.feedExplore).map((m) => m.id)),
    [feedMilestones],
  );
  /* Server đã lọc theo filter/source/linhVuc; client sort theo điểm. */
  const scoreSortedMilestones = useMemo(() => {
    const filtered = feedMilestones.filter(
      (milestone) =>
        matchesFeedSource(milestone, feedSource) &&
        worldJourneyMilestoneMatchesFilter(milestone, activeChip) &&
        worldJourneyMilestoneMatchesLinhVuc(milestone, activeLinhVucSlug),
    );
    return sortWorldJourneyMilestones(
      filtered,
      sort,
      exploreIds,
      viewerProfileId,
    );
  }, [
    feedMilestones,
    feedSource,
    activeChip,
    activeLinhVucSlug,
    sort,
    exploreIds,
    viewerProfileId,
  ]);

  /**
   * First-impression: ghim ≤3 bài mới chưa đánh dấu session lên top (sort «Mới nhất»).
   * Ghi sessionStorage ngay (F5 không ghim lại); giữ id trong RAM để load-more không mất pin.
   */
  const [visibleMilestones, setVisibleMilestones] = useState(
    scoreSortedMilestones,
  );
  const liveFirstImpressionIdsRef = useRef<string[]>([]);
  const liveFirstImpressionResolvedRef = useRef(false);
  const liveFirstImpressionViewerRef = useRef(viewerProfileId);

  useLayoutEffect(() => {
    if (liveFirstImpressionViewerRef.current !== viewerProfileId) {
      liveFirstImpressionViewerRef.current = viewerProfileId;
      liveFirstImpressionIdsRef.current = [];
      liveFirstImpressionResolvedRef.current = false;
    }

    if (sort !== "Mới nhất") {
      setVisibleMilestones(prependPinnedOwnPublishes(scoreSortedMilestones));
      return;
    }

    if (!liveFirstImpressionResolvedRef.current) {
      /* Chờ có data — tránh resolve sớm khi list còn rỗng. */
      if (scoreSortedMilestones.length === 0) {
        setVisibleMilestones([]);
        return;
      }
      const seen = readWorldJourneyFirstImpressionSeen(viewerProfileId);
      const { ordered, newlyPinnedIds } = applyWorldJourneyFirstImpressionPin(
        scoreSortedMilestones,
        seen,
      );
      liveFirstImpressionIdsRef.current = newlyPinnedIds;
      liveFirstImpressionResolvedRef.current = true;
      if (newlyPinnedIds.length > 0) {
        markWorldJourneyFirstImpressionSeen(viewerProfileId, newlyPinnedIds);
      }
      setVisibleMilestones(prependPinnedOwnPublishes(ordered));
      return;
    }

    if (liveFirstImpressionIdsRef.current.length === 0) {
      setVisibleMilestones(prependPinnedOwnPublishes(scoreSortedMilestones));
      return;
    }

    /* Giữ pin đã chọn trong phiên; phần còn lại theo thứ tự điểm. */
    const pinKeys = new Set(liveFirstImpressionIdsRef.current);
    const pinned = liveFirstImpressionIdsRef.current
      .map((id) =>
        scoreSortedMilestones.find(
          (m) => worldJourneyMilestonePinKey(m) === id,
        ),
      )
      .filter((m): m is MilestoneItem => Boolean(m));
    const rest = scoreSortedMilestones.filter(
      (m) => !pinKeys.has(worldJourneyMilestonePinKey(m)),
    );
    setVisibleMilestones(prependPinnedOwnPublishes(pinned.concat(rest)));
  }, [
    scoreSortedMilestones,
    sort,
    viewerProfileId,
    prependPinnedOwnPublishes,
  ]);

  const feedQueryParams = useCallback(
    (offset: number, limit = WORLD_JOURNEY_FEED_PAGE_SIZE) =>
      buildWorldJourneyFeedQuery({
        offset,
        limit,
        filter: activeFilter,
        source: feedSource,
        linhVuc: activeLinhVucSlug,
      }),
    [activeFilter, feedSource, activeLinhVucSlug],
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || filterLoading) {
      return false;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/world-journey/feed?${feedQueryParams(nextOffsetRef.current)}`,
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        milestones: MilestoneItem[];
        hasMore: boolean;
        nextOffset: number;
      };
      setFeedMilestones((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const extra = data.milestones.filter((m) => !seen.has(m.id));
        return [...prev, ...extra];
      });
      hasMoreRef.current = data.hasMore;
      nextOffsetRef.current = data.nextOffset;
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
      return data.hasMore;
    } catch {
      setLoadError(true);
      return false;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [feedQueryParams, filterLoading]);

  /** Đổi bộ lọc → query lại feed + gallery từ offset 0. */
  useEffect(() => {
    if (skipInitialFilterFetchRef.current) {
      skipInitialFilterFetchRef.current = false;
      return;
    }

    const epoch = ++filterQueryEpochRef.current;
    let cancelled = false;

    (async () => {
      setFilterLoading(true);
      setLoadError(false);
      loadingMoreRef.current = false;
      try {
        const feedQs = buildWorldJourneyFeedQuery({
          offset: 0,
          limit: WORLD_JOURNEY_FEED_PAGE_SIZE,
          filter: activeFilter,
          source: feedSource,
          linhVuc: activeLinhVucSlug,
        });
        const galleryQs = buildWorldJourneyFeedQuery({
          offset: 0,
          limit: WORLD_JOURNEY_GALLERY_PAGE_SIZE,
          filter: activeFilter,
          source: feedSource,
        });
        const [feedRes, galleryRes] = await Promise.all([
          fetch(`/api/world-journey/feed?${feedQs}`),
          fetch(`/api/world-journey/gallery?${galleryQs}`),
        ]);
        if (!feedRes.ok || !galleryRes.ok)
          throw new Error("filter fetch failed");
        const feedData = (await feedRes.json()) as {
          milestones: MilestoneItem[];
          hasMore: boolean;
          nextOffset: number;
        };
        const galleryData = (await galleryRes.json()) as {
          items: GalleryMainItem[];
          hasMore: boolean;
          nextOffset: number;
        };
        if (cancelled || epoch !== filterQueryEpochRef.current) return;
        setFeedMilestones(feedData.milestones);
        hasMoreRef.current = feedData.hasMore;
        nextOffsetRef.current = feedData.nextOffset;
        setHasMore(feedData.hasMore);
        setNextOffset(feedData.nextOffset);
        setGalleryRows(galleryData.items);
        setGalleryMore(galleryData.hasMore);
        setGalleryOffset(galleryData.nextOffset);
      } catch {
        if (!cancelled && epoch === filterQueryEpochRef.current) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled && epoch === filterQueryEpochRef.current) {
          setFilterLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFilter, feedSource, activeLinhVucSlug, refreshNonce]);

  const galleryEndpoint = useMemo(() => {
    const qs = buildWorldJourneyFeedQuery({
      limit: WORLD_JOURNEY_GALLERY_PAGE_SIZE,
      filter: activeFilter,
      source: feedSource,
    });
    return `/api/world-journey/gallery?${qs}`;
  }, [activeFilter, feedSource]);

  const isGallery = surfaceView === "gallery";

  return (
    <div
      className={
        "world-journey-home cins-journey-page" + (isGallery ? " view-grid" : "")
      }
      aria-label="World Journey"
    >
      <div className="wj-shell">
        {leftAside ?? (
          <WorldJourneyGuestLeftAside
            linhVucs={linhVucs}
            activeLinhVucSlug={activeLinhVucSlug}
            onLinhVucFilter={setActiveLinhVucSlug}
          />
        )}

        <div className={`wj-feed${isGallery ? " view-grid" : ""}`}>
          <header
            className="wj-feed-header"
            title="Cuộn lên đầu và tải nội dung mới"
            onClick={handleFeedHeaderClick}
          >
            <span className="j-tlb-streak-slow" aria-hidden="true" />
            <WorldJourneyFilterBar
              surfaceView={surfaceView}
              onSurfaceView={handleSurfaceView}
            />
          </header>

          {pendingConfirmations}
          {!isGallery ? (
            <CinsFeedComposer
              ownerSlug={sidebarProfile.slug}
              ownerName={sidebarProfile.tenHienThi}
              avatarUrl={sidebarProfile.avatarUrl}
              layout="feed"
            />
          ) : null}

          {isGallery ? (
            filterLoading ? (
              <WorldJourneyFilterSearching surface="gallery" />
            ) : galleryRows.length === 0 && !galleryMore ? (
              <div className="wj-feed-empty">
                <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
                {activeFilter !== "all" || feedSource !== "all" ? (
                  <>
                    <b>Không có ô khớp bộ lọc</b>
                    <p>Thử «Tất cả» hoặc «Tất cả nhúng», hoặc đổi lọc nguồn.</p>
                  </>
                ) : (
                  <>
                    <b>Gallery đang trống</b>
                    <p>
                      Dự án <strong>Nổi bật</strong> của mọi người, bài cộng
                      đồng có media, và <strong>Showcase</strong> studio sẽ hiện
                      ở đây.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <JourneyGalleryGridView
                key={galleryEndpoint}
                hideToolbar
                sourceFilter={feedSource}
                initialItems={galleryRows}
                totalCount={galleryRows.length}
                scrollLoad={{
                  ownerSlug: sidebarProfile.slug,
                  hasMore: galleryMore,
                  nextOffset: galleryOffset,
                  endpoint: galleryEndpoint,
                }}
              />
            )
          ) : visibleMilestones.length === 0 ? (
            filterLoading || loadingMore ? (
              <WorldJourneyFilterSearching surface="feed" />
            ) : (
              <div className="wj-feed-empty">
                <Sparkles size={22} strokeWidth={1.8} aria-hidden />
                {activeFilter !== "all" ||
                activeLinhVucSlug ||
                feedSource !== "all" ? (
                  <>
                    <b>Không có bài khớp bộ lọc</b>
                    <p>
                      Thử «Tất cả», «Tất cả nhúng», hoặc đổi lọc nguồn nội dung.
                    </p>
                  </>
                ) : (
                  <>
                    <b>Feed đang trống</b>
                    <p>
                      Theo dõi vài người hoặc tổ chức, hoặc khám phá bài{" "}
                      <strong>Công khai</strong> / <strong>Nổi bật</strong> từ
                      cộng đồng — tất cả sẽ hiện ở đây.
                    </p>
                  </>
                )}
              </div>
            )
          ) : (
            <WorldJourneyFeedTimeline
              milestones={visibleMilestones}
              viewerProfileId={viewerProfileId}
              feedPromos={feedPromos}
              scrollLoad={hasMore ? { enabled: true } : null}
              loadingMore={loadingMore}
              loadError={loadError}
              onLoadMore={() => void loadMore()}
            />
          )}

          {!isGallery && visibleMilestones.length > 0 && !hasMore ? (
            <div className="wj-feed-end">
              <b>Đã hết nội dung mới</b>
            </div>
          ) : null}
        </div>

        {rightAside ?? <WorldJourneyGuestRightAside />}
      </div>
      <BunnyVideoProcessingPoller ownerSlug={sidebarProfile.slug} />
    </div>
  );
}
