"use client";

import {
  ArrowDownNarrowWide,
  Building2,
  Check,
  ChevronLeft,
  Code2,
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Search,
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
import { OrgNotifyFabHost } from "@/components/org/OrgNotifyFab";
import {
  buildWorldJourneyFeedQuery,
  findWorldJourneyFilterChip,
  parseWorldJourneyEmbedFilterPlatforms,
  toggleWorldJourneyEmbedFilterPlatform,
  worldJourneyEmbedFilterId,
  worldJourneyMilestoneMatchesFilter,
  worldJourneyMilestoneMatchesLinhVuc,
  WORLD_JOURNEY_SORT_OPTIONS,
  type WjFilterChip,
} from "@/lib/cins/worldJourneyFeedFilters";
import {
  EMBED_PLATFORM_GROUPS,
  getTier1PlatformsByGroup,
} from "@/lib/editor/embed-providers";
import { EMBED_PLATFORM_LOGO } from "@/lib/editor/embed-platform-logos";
import {
  WORLD_JOURNEY_AUTHOR_ECHO_MS,
  WORLD_JOURNEY_FEED_PAGE_SIZE,
  WORLD_JOURNEY_GALLERY_PAGE_SIZE,
} from "@/lib/cins/worldJourneyFeedConstants";
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

function feedSourceIcon(icon: string) {
  const props = { size: 15, strokeWidth: 2 };
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
  const [filterPanel, setFilterPanel] = useState<"main" | "embed">("main");
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
    if (!filterOpen) {
      setFilterPanel("main");
      return;
    }
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

  const activeChip =
    findWorldJourneyFilterChip(chips, activeFilter) ?? chips[0];
  const isEmbedFilterActive =
    activeFilter === "embed" || activeFilter.startsWith("embed:");
  const selectedEmbedPlatforms =
    parseWorldJourneyEmbedFilterPlatforms(activeFilter) ?? [];
  const activeSource =
    FEED_SOURCE_OPTIONS.find((o) => o.value === feedSource) ??
    FEED_SOURCE_OPTIONS[0];

  const chipIcon = (icon: string) => {
    const props = { size: 15, strokeWidth: 2 };
    switch (icon) {
      case "sparkles":
        return <Sparkles {...props} />;
      case "image":
        return <ImageIcon {...props} />;
      case "video":
        return <Video {...props} />;
      case "file-text":
        return <FileText {...props} />;
      case "code-2":
        return <Code2 {...props} />;
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
          aria-label={activeSource.label}
          title={activeSource.label}
          onClick={(e) => {
            e.stopPropagation();
            setSourceOpen((v) => !v);
          }}
        >
          {feedSourceIcon(activeSource.icon)}
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
                <Check className="wj-filter-check" size={13} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="wj-filter-wrap" ref={filterRef}>
        <button
          type="button"
          className="wj-filter-btn"
          aria-haspopup="menu"
          aria-expanded={filterOpen}
          aria-label={activeChip.label}
          title={activeChip.label}
          onClick={(e) => {
            e.stopPropagation();
            setFilterOpen((v) => {
              if (v) setFilterPanel("main");
              return !v;
            });
          }}
        >
          {chipIcon(activeChip.icon)}
        </button>
        {filterOpen ? (
          <div
            className={
              "wj-filter-pop" +
              (filterPanel === "embed" ? " is-embed-panel" : "")
            }
            role="menu"
            aria-label={
              filterPanel === "embed"
                ? "Lọc theo nền tảng nhúng"
                : "Lọc loại nội dung"
            }
          >
            {filterPanel === "embed" ? (
              <>
                <div className="wj-filter-embed-head">
                  <button
                    type="button"
                    className="wj-filter-embed-back"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterPanel("main");
                    }}
                  >
                    <ChevronLeft size={14} strokeWidth={2.2} aria-hidden />
                    Loại
                  </button>
                  <span className="wj-filter-embed-head-title">Nhúng</span>
                </div>
                <button
                  type="button"
                  className={
                    isEmbedFilterActive && selectedEmbedPlatforms.length === 0
                      ? "sel"
                      : undefined
                  }
                  role="menuitemcheckbox"
                  aria-checked={
                    isEmbedFilterActive && selectedEmbedPlatforms.length === 0
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilter(worldJourneyEmbedFilterId(null));
                  }}
                >
                  <Code2 size={13} strokeWidth={2} aria-hidden />
                  <span>Tất cả nền tảng</span>
                  <Check className="wj-filter-check" size={13} />
                </button>
                {EMBED_PLATFORM_GROUPS.map((group) => {
                  const platforms = getTier1PlatformsByGroup(group.id);
                  if (!platforms.length) return null;
                  return (
                    <div key={group.id} className="wj-filter-embed-group">
                      <div className="wj-filter-embed-group-label">
                        {group.label}
                      </div>
                      {platforms.map((platform) => {
                        const selected = selectedEmbedPlatforms.includes(
                          platform.id,
                        );
                        return (
                          <button
                            key={platform.id}
                            type="button"
                            className={selected ? "sel" : undefined}
                            role="menuitemcheckbox"
                            aria-checked={selected}
                            onClick={(e) => {
                              e.stopPropagation();
                              onFilter(
                                toggleWorldJourneyEmbedFilterPlatform(
                                  isEmbedFilterActive ? activeFilter : "embed",
                                  platform.id,
                                ),
                              );
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              className="wj-filter-embed-logo"
                              src={EMBED_PLATFORM_LOGO[platform.id]}
                              alt=""
                              width={16}
                              height={16}
                              loading="lazy"
                              decoding="async"
                            />
                            <span>{platform.label}</span>
                            <Check className="wj-filter-check" size={13} />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            ) : (
              chips.map((chip) => {
                if (chip.kind === "embed") {
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={isEmbedFilterActive ? "sel" : undefined}
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isEmbedFilterActive) {
                          onFilter(worldJourneyEmbedFilterId(null));
                        }
                        setFilterPanel("embed");
                      }}
                    >
                      {chipIcon(chip.icon)}
                      <span>{chip.label}</span>
                      <Check className="wj-filter-check" size={13} />
                    </button>
                  );
                }

                return (
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
                    <Check className="wj-filter-check" size={13} />
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      {!isGallery ? (
        <div className="wj-sort-wrap" ref={sortRef}>
          <button
            type="button"
            className="wj-sort-btn"
            aria-expanded={sortOpen}
            aria-haspopup="menu"
            aria-label={`Sắp xếp: ${sort}`}
            title={`Sắp xếp: ${sort}`}
            onClick={(e) => {
              e.stopPropagation();
              onSortOpen(!sortOpen);
            }}
          >
            <ArrowDownNarrowWide size={15} strokeWidth={2} aria-hidden />
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
                  <Check className="wj-filter-check" size={13} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <span className="wj-filter-spacer" />
      <div className="wj-filter-trail">
        {/* Mobile/tablet: briefcase + lịch portal vào các slot này. */}
        <OrgNotifyFabHost slot="jobs" className="wj-notify-fab-host" />
        <OrgNotifyFabHost slot="notify" className="wj-notify-fab-host" />
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
          : "Đang query lại feed khớp bộ lọc đã chọn."}
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
  const [galleryRows, setGalleryRows] = useState(galleryItems);
  const [galleryMore, setGalleryMore] = useState(galleryHasMore);
  const [galleryOffset, setGalleryOffset] = useState(galleryNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(feedHasMore);
  const nextOffsetRef = useRef(feedNextOffset);
  const filterQueryEpochRef = useRef(0);
  const skipInitialFilterFetchRef = useRef(true);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    nextOffsetRef.current = nextOffset;
  }, [nextOffset]);

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

  /**
   * Bài vừa đăng của chính viewer — giữ trên feed khi SSR/cache chưa kịp
   * (author-echo L30 phải thấy ngay, không bị điểm / boost đẩy khỏi trang đầu).
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

  useEffect(() => {
    /* Không ghi đè kết quả query filter bằng props SSR trang đầu. */
    if (
      filterLoading ||
      activeFilter !== "all" ||
      activeLinhVucSlug ||
      feedSource !== "all"
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
      };
      const pinKey = milestone.cotMocId ?? milestone.id;
      pinnedOwnPublishRef.current.set(pinKey, {
        milestone,
        expiresAt: Date.now() + WORLD_JOURNEY_AUTHOR_ECHO_MS,
      });
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
  }, [sidebarProfile.slug, viewerProfileId]);

  const activeChip = findWorldJourneyFilterChip(filterChips, activeFilter);
  const exploreIds = useMemo(
    () => new Set(feedMilestones.filter((m) => m.feedExplore).map((m) => m.id)),
    [feedMilestones],
  );
  /* Server đã lọc theo filter/source/linhVuc; client chỉ sort + giữ an toàn cho bài compose vừa đăng. */
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
  }, [activeFilter, feedSource, activeLinhVucSlug]);

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
          <header className="wj-feed-header">
            <span className="j-tlb-streak-slow" aria-hidden="true" />
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
                sourceFilter="all"
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
