"use client";

import {
  ArrowDownNarrowWide,
  Check,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { WorldJourneyFeedTimeline } from "@/components/cins/world-journey/WorldJourneyFeedTimeline";
import { WorldJourneyGuestLeftAside } from "@/components/cins/world-journey/WorldJourneyGuestLeftAside";
import { WorldJourneyGuestRightAside } from "@/components/cins/world-journey/WorldJourneyGuestRightAside";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
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
import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  COMPOSE_PUBLISHED_EVENT,
  type ComposePublishedDetail,
} from "@/lib/journey/compose-published-sync";
import { mergeMilestoneIntoTimeline } from "@/lib/journey/timeline-merge";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
/* Inline unfold + bình luận dùng `.cins-post-view` — cùng CSS với journey layout / modal. */
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";
import "@/app/world-journey-feed.css";

function WorldJourneyFilterBar({
  chips,
  activeFilter,
  onFilter,
  sort,
  onSort,
  sortOpen,
  onSortOpen,
}: {
  chips: WjFilterChip[];
  activeFilter: string;
  onFilter: (id: string) => void;
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
  feedHasMore = false,
  feedNextOffset = milestones.length,
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
  leftAside?: ReactNode;
  rightAside?: ReactNode;
  /** Banner "việc cần xác nhận" — hiện đầu cột feed để user chú ý. */
  pendingConfirmations?: ReactNode;
  feedPromos?: FeedPromoVariant[];
}) {
  const [activeFilter, setActiveFilter] = useState("all");
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
      new Set(
        feedMilestones.filter((m) => m.feedExplore).map((m) => m.id),
      ),
    [feedMilestones],
  );
  const visibleMilestones = useMemo(() => {
    const filtered = feedMilestones.filter(
      (milestone) =>
        worldJourneyMilestoneMatchesFilter(milestone, activeChip) &&
        worldJourneyMilestoneMatchesLinhVuc(milestone, activeLinhVucSlug),
    );
    return sortWorldJourneyMilestones(filtered, sort, exploreIds);
  }, [feedMilestones, activeChip, activeLinhVucSlug, sort, exploreIds]);

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

  return (
    <JourneyViewProvider initialView="journey" slug={sidebarProfile.slug}>
      <div className="world-journey-home cins-journey-page" aria-label="World Journey">
        <header className="wj-feed-header">
          <WorldJourneyFilterBar
            chips={filterChips}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            sort={sort}
            onSort={setSort}
            sortOpen={sortOpen}
            onSortOpen={setSortOpen}
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

          <div className="wj-feed">
            {pendingConfirmations}
            <CinsFeedComposer
              ownerSlug={sidebarProfile.slug}
              ownerName={sidebarProfile.tenHienThi}
              avatarUrl={sidebarProfile.avatarUrl}
              layout="feed"
            />

            {visibleMilestones.length === 0 ? (
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
                scrollLoad={hasMore ? { enabled: true } : null}
                loadingMore={loadingMore}
                loadError={loadError}
                onLoadMore={() => void loadMore()}
              />
            )}

            {visibleMilestones.length > 0 && !hasMore ? (
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
