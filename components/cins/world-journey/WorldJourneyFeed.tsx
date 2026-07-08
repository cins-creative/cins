"use client";

import dynamic from "next/dynamic";
import {
  ArrowDownNarrowWide,
  Check,
  ChevronDown,
  FileText,
  History,
  Image as ImageIcon,
  LayoutGrid,
  Rows3,
  Sparkles,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { WorldJourneyFeedTimeline } from "@/components/cins/world-journey/WorldJourneyFeedTimeline";
import { WorldJourneyGuestLeftAside } from "@/components/cins/world-journey/WorldJourneyGuestLeftAside";
import { WorldJourneyGuestRightAside } from "@/components/cins/world-journey/WorldJourneyGuestRightAside";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import { JourneyViewProvider } from "@/components/journey/JourneyViewContext";
import {
  findWorldJourneyFilterChip,
  worldJourneyMilestoneMatchesFilter,
  worldJourneyMilestoneMatchesLinhVuc,
  WORLD_JOURNEY_SORT_OPTIONS,
  type WjFilterChip,
} from "@/lib/cins/worldJourneyFeedFilters";
import { sortWorldJourneyMilestones } from "@/lib/cins/worldJourneyFeedSort";
import { worldJourneyMilestonesToGalleryItems } from "@/lib/cins/worldJourneyMilestoneToGallery";
import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  COMPOSE_PUBLISHED_EVENT,
  type ComposePublishedDetail,
} from "@/lib/journey/compose-published-sync";
import { mergeMilestoneIntoTimeline } from "@/lib/journey/timeline-merge";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import {
  homeFeedHref,
  resolveHomeFeedDisplay,
  type HomeFeedDisplay,
} from "@/lib/cins/home-feed-display-url";

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
/* Inline unfold + bình luận dùng `.cins-post-view` — cùng CSS với journey layout / modal. */
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";
import "@/app/world-journey-feed.css";

type FeedView = HomeFeedDisplay;

function WorldJourneyGridSkeleton() {
  return (
    <div
      className="j-main-gallery-grid j-main-gallery-grid--loading"
      aria-busy="true"
      aria-label="Đang tải lưới"
    />
  );
}

const JourneyGalleryGridView = dynamic(
  () =>
    import("@/components/journey/JourneyGalleryGridView").then(
      (m) => m.JourneyGalleryGridView,
    ),
  { loading: () => <WorldJourneyGridSkeleton /> },
);

function prefetchJourneyGalleryGrid() {
  void import("@/components/journey/JourneyGalleryGridView");
}

function WorldJourneyFilterBar({
  chips,
  activeFilter,
  onFilter,
  view,
  onViewChange,
  onPrefetchGrid,
  sort,
  onSort,
  sortOpen,
  onSortOpen,
}: {
  chips: WjFilterChip[];
  activeFilter: string;
  onFilter: (id: string) => void;
  view: FeedView;
  onViewChange: (view: FeedView) => void;
  onPrefetchGrid?: () => void;
  sort: (typeof WORLD_JOURNEY_SORT_OPTIONS)[number];
  onSort: (s: (typeof WORLD_JOURNEY_SORT_OPTIONS)[number]) => void;
  sortOpen: boolean;
  onSortOpen: (open: boolean) => void;
}) {
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);

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

  const activeChip =
    chips.find((c) => c.id === activeFilter) ?? chips[0];

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
      <span className="wj-filter-spacer" />
      <div className="wj-view-toggle" role="group" aria-label="Chế độ xem">
        <button
          type="button"
          className={`wj-vt-btn${view === "feed" ? " active" : ""}`}
          aria-label="Dòng thời gian"
          title="Dòng thời gian"
          aria-pressed={view === "feed"}
          onClick={() => onViewChange("feed")}
        >
          <Rows3 size={15} />
        </button>
        <button
          type="button"
          className={`wj-vt-btn${view === "grid" ? " active" : ""}`}
          aria-label="Lưới"
          title="Lưới"
          aria-pressed={view === "grid"}
          onMouseEnter={onPrefetchGrid}
          onFocus={onPrefetchGrid}
          onClick={() => onViewChange("grid")}
        >
          <LayoutGrid size={15} />
        </button>
      </div>
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
    </div>
  );
}

export function WorldJourneyFeed({
  sidebarProfile,
  viewerProfileId,
  filterChips,
  linhVucs,
  milestones,
  exploreMilestones,
  leftAside,
  rightAside,
  pendingConfirmations,
  feedPromos,
  feedView = "feed",
}: {
  sidebarProfile: SidebarProfile;
  viewerProfileId: string;
  filterChips: WjFilterChip[];
  linhVucs: WjLinhVucAsideItem[];
  milestones: MilestoneItem[];
  /** Tab Khám phá — bài Nổi bật toàn cục (brief §3 empty-state). */
  exploreMilestones?: MilestoneItem[];
  leftAside?: ReactNode;
  rightAside?: ReactNode;
  /** Banner "việc cần xác nhận" — hiện đầu cột feed để user chú ý. */
  pendingConfirmations?: ReactNode;
  feedPromos?: FeedPromoVariant[];
  /** Chế độ xem feed — `/?display=luoi` (grid) · `/` (feed); legacy `/luoi`. */
  feedView?: HomeFeedDisplay;
}) {
  const [view, setView] = useState<FeedView>(feedView);

  useEffect(() => {
    setView(feedView);
  }, [feedView]);

  const handleViewChange = useCallback((next: FeedView) => {
    setView((current) => {
      if (current === next) return current;
      const href = homeFeedHref(next);
      window.history.pushState(null, "", href);
      return next;
    });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setView(
        resolveHomeFeedDisplay(
          window.location.pathname,
          window.location.search,
        ),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [activeFilter, setActiveFilter] = useState("all");
  const [activeLinhVucSlug, setActiveLinhVucSlug] = useState<string | null>(
    null,
  );
  const [sort, setSort] = useState<(typeof WORLD_JOURNEY_SORT_OPTIONS)[number]>(
    WORLD_JOURNEY_SORT_OPTIONS[0],
  );
  const [sortOpen, setSortOpen] = useState(false);
  const [feedMilestones, setFeedMilestones] = useState(milestones);

  useEffect(() => {
    setFeedMilestones(milestones);
  }, [milestones]);

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
  /* 1 feed duy nhất: bài từ người đang theo dõi xếp trên, rồi tới bài Khám phá
     (khử trùng lặp theo id). */
  const sourceMilestones = useMemo(() => {
    if (exploreMilestones === undefined) return feedMilestones;
    const seen = new Set(feedMilestones.map((m) => m.id));
    const exploreExtra = exploreMilestones.filter((m) => !seen.has(m.id));
    return [...feedMilestones, ...exploreExtra];
  }, [feedMilestones, exploreMilestones]);
  const exploreIds = useMemo(() => {
    if (exploreMilestones === undefined) return new Set<string>();
    const followingIds = new Set(feedMilestones.map((m) => m.id));
    return new Set(
      exploreMilestones
        .filter((m) => !followingIds.has(m.id))
        .map((m) => m.id),
    );
  }, [feedMilestones, exploreMilestones]);

  const visibleMilestones = useMemo(() => {
    const filtered = sourceMilestones.filter(
      (milestone) =>
        worldJourneyMilestoneMatchesFilter(milestone, activeChip) &&
        worldJourneyMilestoneMatchesLinhVuc(milestone, activeLinhVucSlug),
    );
    return sortWorldJourneyMilestones(filtered, sort, exploreIds);
  }, [sourceMilestones, activeChip, activeLinhVucSlug, sort, exploreIds]);

  const galleryItems = useMemo(
    () =>
      view === "grid"
        ? worldJourneyMilestonesToGalleryItems(visibleMilestones)
        : [],
    [visibleMilestones, view],
  );

  useEffect(() => {
    if (feedView === "grid") prefetchJourneyGalleryGrid();
  }, [feedView]);

  return (
    <JourneyViewProvider initialView="journey" slug={sidebarProfile.slug}>
      <div
        className={`world-journey-home cins-journey-page${view === "grid" ? " view-grid" : ""}`}
        aria-label="World Journey"
      >
        <header className="wj-feed-header">
          <WorldJourneyFilterBar
            chips={filterChips}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            view={view}
            onViewChange={handleViewChange}
            onPrefetchGrid={prefetchJourneyGalleryGrid}
            sort={sort}
            onSort={setSort}
            sortOpen={sortOpen}
            onSortOpen={setSortOpen}
          />
        </header>

        <div className={`wj-shell${view === "grid" ? " view-grid" : ""}`}>
          {view !== "grid" &&
            (leftAside ?? (
              <WorldJourneyGuestLeftAside
                linhVucs={linhVucs}
                activeLinhVucSlug={activeLinhVucSlug}
                onLinhVucFilter={setActiveLinhVucSlug}
              />
            ))}

          <div className={`wj-feed${view === "grid" ? " view-grid" : ""}`}>
            {view !== "grid" ? pendingConfirmations : null}
            {view !== "grid" ? (
              <CinsFeedComposer
                ownerSlug={sidebarProfile.slug}
                ownerName={sidebarProfile.tenHienThi}
                avatarUrl={sidebarProfile.avatarUrl}
                layout="feed"
              />
            ) : null}

          {view === "feed" ? (
            visibleMilestones.length === 0 ? (
              <div className="wj-feed-empty">
                <Sparkles size={22} strokeWidth={1.8} aria-hidden />
                <b>Feed đang trống</b>
                <p>
                  Theo dõi vài người hoặc tổ chức, hoặc khám phá bài{" "}
                  <strong>Công khai</strong> / <strong>Nổi bật</strong> từ cộng đồng
                  — tất cả sẽ hiện ở đây.
                </p>
              </div>
            ) : (
              <WorldJourneyFeedTimeline
                milestones={visibleMilestones}
                viewerProfileId={viewerProfileId}
                feedPromos={feedPromos}
              />
            )
          ) : galleryItems.length === 0 ? (
            <div className="wj-feed-empty">
              <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
              <b>Chưa có tác phẩm</b>
              <p>
                Ảnh, video và bài có cover từ feed sẽ hiện dạng lưới ở đây.
              </p>
            </div>
          ) : (
            <JourneyGalleryGridView
              initialItems={galleryItems}
              totalCount={galleryItems.length}
              hideToolbar
            />
          )}

          {visibleMilestones.length > 0 && view === "feed" ? (
            <div className="wj-feed-end">
              <b>Đã hết feed mới</b>
              <button type="button" className="wj-btn wj-btn-outline">
                <History size={15} />
                Xem thêm post cũ
              </button>
            </div>
          ) : null}
        </div>

        {view !== "grid" &&
          (rightAside ?? <WorldJourneyGuestRightAside />)}
      </div>
    </div>
    </JourneyViewProvider>
  );
}
