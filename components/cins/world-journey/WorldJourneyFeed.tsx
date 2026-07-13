"use client";

import {
  ArrowDownNarrowWide,
  Building2,
  Check,
  ChevronDown,
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Sparkles,
  User,
  Users,
  Video,
  Waypoints,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { WorldJourneyFeedTimeline } from "@/components/cins/world-journey/WorldJourneyFeedTimeline";
import { WorldJourneyGuestLeftAside } from "@/components/cins/world-journey/WorldJourneyGuestLeftAside";
import { WorldJourneyGuestRightAside } from "@/components/cins/world-journey/WorldJourneyGuestRightAside";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyGalleryGridView } from "@/components/journey/JourneyGalleryGridView";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import { JourneyViewProvider } from "@/components/journey/JourneyViewContext";
import {
  findWorldJourneyFilterChip,
  worldJourneyMilestoneMatchesFilter,
  worldJourneyMilestoneMatchesLinhVuc,
  WORLD_JOURNEY_SORT_OPTIONS,
  type WjFilterChip,
} from "@/lib/cins/worldJourneyFeedFilters";
import { WORLD_JOURNEY_FEED_PAGE_SIZE } from "@/lib/cins/worldJourneyFeedConstants";
import { sortWorldJourneyMilestones } from "@/lib/cins/worldJourneyFeedSort";
import {
  FEED_SOURCE_CHANGE_EVENT,
  FEED_SOURCE_OPTIONS,
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

function feedSourceIcon(icon: string) {
  const props = { size: 13, strokeWidth: 2 };
  switch (icon) {
    case "globe":
      return <Globe {...props} />;
    case "users":
      return <Users {...props} />;
    case "user":
      return <User {...props} />;
    case "building":
      return <Building2 {...props} />;
    default:
      return null;
  }
}

function WorldJourneyFilterBar({
  chips,
  activeFilter,
  onFilter,
  feedSource,
  onFeedSource,
  sort,
  onSort,
  sortOpen,
  onSortOpen,
  surfaceView,
  onSurfaceView,
}: {
  chips: WjFilterChip[];
  activeFilter: string;
  onFilter: (id: string) => void;
  feedSource: FeedSourceFilter;
  onFeedSource: (value: FeedSourceFilter) => void;
  sort: (typeof WORLD_JOURNEY_SORT_OPTIONS)[number];
  onSort: (s: (typeof WORLD_JOURNEY_SORT_OPTIONS)[number]) => void;
  sortOpen: boolean;
  onSortOpen: (open: boolean) => void;
  surfaceView: FeedSurfaceView;
  onSurfaceView: (view: FeedSurfaceView) => void;
}) {
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const isGallery = surfaceView === "gallery";

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) onSortOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen, onSortOpen]);

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

  useEffect(() => {
    if (!sourceOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sourceRef.current?.contains(e.target as Node)) setSourceOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sourceOpen]);

  const activeChip = chips.find((c) => c.id === activeFilter) ?? chips[0];
  const activeSource =
    FEED_SOURCE_OPTIONS.find((o) => o.value === feedSource) ??
    FEED_SOURCE_OPTIONS[0];

  const chipIcon = (icon: string) => {
    const props = { size: 13, strokeWidth: 2 };
    switch (icon) {
      case "sparkles":
        return <Sparkles {...props} />;
      case "image":
        return <ImageIcon {...props} />;
      case "video":
        return <Video {...props} />;
      case "file-text":
        return <FileText {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="wj-filter-bar">
      <div className="wj-filter-wrap wj-source-wrap" ref={sourceRef}>
        <button
          type="button"
          className="wj-filter-btn"
          aria-haspopup="menu"
          aria-expanded={sourceOpen}
          onClick={(e) => {
            e.stopPropagation();
            setSourceOpen((v) => !v);
          }}
        >
          {feedSourceIcon(activeSource.icon)}
          <span className="wj-filter-val">{activeSource.label}</span>
          <ChevronDown size={13} />
        </button>
        {sourceOpen ? (
          <div className="wj-filter-pop wj-source-pop" role="menu">
            {FEED_SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={feedSource === opt.value ? "sel" : undefined}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedSource(opt.value);
                  setSourceOpen(false);
                }}
              >
                {feedSourceIcon(opt.icon)}
                <span>{opt.label}</span>
                <Check size={13} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {!isGallery ? (
        <div className="wj-filter-wrap" ref={filterRef}>
          <button
            type="button"
            className="wj-filter-btn"
            aria-haspopup="menu"
            aria-expanded={filterOpen}
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen((v) => !v);
            }}
          >
            {chipIcon(activeChip.icon)}
            <span className="wj-filter-val">{activeChip.label}</span>
            <ChevronDown size={13} />
          </button>
          {filterOpen ? (
            <div className="wj-filter-pop" role="menu">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={activeFilter === chip.id ? "sel" : undefined}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilter(chip.id);
                    setFilterOpen(false);
                  }}
                >
                  {chipIcon(chip.icon)}
                  <span>{chip.label}</span>
                  <Check size={13} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="wj-gallery-header-label">
          Gallery · Nổi bật &amp; Showcase
        </div>
      )}
      <span className="wj-filter-spacer" />
      {!isGallery ? (
        <div className="wj-sort-wrap" ref={sortRef}>
          <button
            type="button"
            className="wj-sort-btn"
            aria-expanded={sortOpen}
            aria-haspopup="menu"
            onClick={(e) => {
              e.stopPropagation();
              onSortOpen(!sortOpen);
            }}
          >
            <ArrowDownNarrowWide size={13} />
            <span>Sắp xếp:</span>
            <span className="wj-sort-val">{sort}</span>
            <ChevronDown size={13} />
          </button>
          {sortOpen ? (
            <div className="wj-sort-pop" role="menu">
              {WORLD_JOURNEY_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={sort === opt ? "sel" : undefined}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSort(opt);
                    onSortOpen(false);
                  }}
                >
                  {opt}
                  <Check size={13} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="wj-view-toggle" role="group" aria-label="Chế độ xem">
        <button
          type="button"
          className={`wj-vt-btn${surfaceView === "journey" ? " active" : ""}`}
          aria-label="Dòng thời gian"
          aria-pressed={surfaceView === "journey"}
          title="Dòng thời gian"
          onClick={() => onSurfaceView("journey")}
        >
          <Waypoints size={15} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          className={`wj-vt-btn${surfaceView === "gallery" ? " active" : ""}`}
          aria-label="Gallery"
          aria-pressed={surfaceView === "gallery"}
          title="Gallery"
          onClick={() => onSurfaceView("gallery")}
        >
          <LayoutGrid size={15} strokeWidth={2} aria-hidden />
        </button>
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
  const [activeFilter, setActiveFilter] = useState("all");
  const [feedSource, setFeedSource] = useState<FeedSourceFilter>("all");
  const [activeLinhVucSlug, setActiveLinhVucSlug] = useState<string | null>(
    null,
  );
  const [sort, setSort] = useState<(typeof WORLD_JOURNEY_SORT_OPTIONS)[number]>(
    WORLD_JOURNEY_SORT_OPTIONS[0],
  );
  const [sortOpen, setSortOpen] = useState(false);
  const [feedMilestones, setFeedMilestones] = useState(milestones);
  const [hasMore, setHasMore] = useState(feedHasMore);
  const [nextOffset, setNextOffset] = useState(feedNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingMoreRef = useRef(false);

  const handleSurfaceView = useCallback((next: FeedSurfaceView) => {
    setSurfaceView(next);
    window.history.pushState({ wjView: next }, "", feedViewHref(next));
  }, []);

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

  useEffect(() => {
    setFeedMilestones(milestones);
    setHasMore(feedHasMore);
    setNextOffset(feedNextOffset);
  }, [milestones, feedHasMore, feedNextOffset]);

  useEffect(() => {
    const onComposePublished = (event: Event) => {
      const detail = (event as CustomEvent<ComposePublishedDetail>).detail;
      if (!detail?.ownerSlug || detail.ownerSlug !== sidebarProfile.slug) return;
      if (!detail.milestone) return;
      setFeedMilestones((prev) =>
        mergeMilestoneIntoTimeline(prev, detail.milestone!),
      );
    };
    window.addEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
    return () =>
      window.removeEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
  }, [sidebarProfile.slug]);

  const activeChip = findWorldJourneyFilterChip(filterChips, activeFilter);
  const exploreIds = useMemo(
    () =>
      new Set(feedMilestones.filter((m) => m.feedExplore).map((m) => m.id)),
    [feedMilestones],
  );
  const visibleMilestones = useMemo(() => {
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

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/world-journey/feed?offset=${nextOffset}&limit=${WORLD_JOURNEY_FEED_PAGE_SIZE}`,
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
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      setLoadError(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, nextOffset]);

  const isGallery = surfaceView === "gallery";

  return (
    <JourneyViewProvider initialView="journey" slug={sidebarProfile.slug}>
      <div
        className={
          "world-journey-home cins-journey-page" +
          (isGallery ? " view-grid" : "")
        }
        aria-label="World Journey"
      >
        <header className="wj-feed-header">
          <WorldJourneyFilterBar
            chips={filterChips}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            feedSource={feedSource}
            onFeedSource={setFeedSource}
            sort={sort}
            onSort={setSort}
            sortOpen={sortOpen}
            onSortOpen={setSortOpen}
            surfaceView={surfaceView}
            onSurfaceView={handleSurfaceView}
          />
        </header>

        <div className="wj-shell">
          {leftAside ?? (
            <WorldJourneyGuestLeftAside
              linhVucs={linhVucs}
              activeLinhVucSlug={activeLinhVucSlug}
              onLinhVucFilter={setActiveLinhVucSlug}
            />
          )}

          <div className={`wj-feed${isGallery ? " view-grid" : ""}`}>
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
              galleryItems.length === 0 && !galleryHasMore ? (
                <div className="wj-feed-empty">
                  <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
                  <b>Gallery đang trống</b>
                  <p>
                    Dự án <strong>Nổi bật</strong> của mọi người, bài cộng đồng
                    có media, và <strong>Showcase</strong> studio sẽ hiện ở đây.
                  </p>
                </div>
              ) : (
                <JourneyGalleryGridView
                  hideToolbar
                  sourceFilter={feedSource}
                  initialItems={galleryItems}
                  totalCount={galleryItems.length}
                  scrollLoad={{
                    ownerSlug: sidebarProfile.slug,
                    hasMore: galleryHasMore,
                    nextOffset: galleryNextOffset,
                    endpoint: "/api/world-journey/gallery",
                  }}
                />
              )
            ) : visibleMilestones.length === 0 ? (
              <div className="wj-feed-empty">
                <Sparkles size={22} strokeWidth={1.8} aria-hidden />
                <b>Feed đang trống</b>
                <p>
                  Theo dõi vài người hoặc tổ chức, hoặc khám phá bài{" "}
                  <strong>Công khai</strong> / <strong>Nổi bật</strong> từ cộng
                  đồng — tất cả sẽ hiện ở đây.
                </p>
              </div>
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
                <b>Đã hết feed mới</b>
              </div>
            ) : null}
          </div>

          {rightAside ?? <WorldJourneyGuestRightAside />}
        </div>
        <BunnyVideoProcessingPoller ownerSlug={sidebarProfile.slug} />
      </div>
    </JourneyViewProvider>
  );
}
