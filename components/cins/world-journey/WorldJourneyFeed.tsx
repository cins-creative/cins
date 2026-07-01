"use client";

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
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { WorldJourneyFeedTimeline } from "@/components/cins/world-journey/WorldJourneyFeedTimeline";
import { WorldJourneyGuestLeftAside } from "@/components/cins/world-journey/WorldJourneyGuestLeftAside";
import { WorldJourneyGuestRightAside } from "@/components/cins/world-journey/WorldJourneyGuestRightAside";
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
import { worldJourneyMilestonesToGalleryItems } from "@/lib/cins/worldJourneyMilestoneToGallery";
import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
import "@/app/world-journey-feed.css";

type FeedView = "feed" | "grid";

function WorldJourneyFilterBar({
  chips,
  activeFilter,
  onFilter,
  view,
  onView,
  sort,
  onSort,
  sortOpen,
  onSortOpen,
}: {
  chips: WjFilterChip[];
  activeFilter: string;
  onFilter: (id: string) => void;
  view: FeedView;
  onView: (v: FeedView) => void;
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
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [sortOpen, onSortOpen]);

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
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
          onClick={() => setFilterOpen((v) => !v)}
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
                onClick={() => {
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
          onClick={() => onView("feed")}
        >
          <Rows3 size={15} />
        </button>
        <button
          type="button"
          className={`wj-vt-btn${view === "grid" ? " active" : ""}`}
          aria-label="Lưới"
          title="Lưới"
          onClick={() => onView("grid")}
        >
          <LayoutGrid size={15} />
        </button>
      </div>
      <div className="wj-sort-wrap" ref={sortRef}>
        <button
          type="button"
          className="wj-sort-btn"
          aria-expanded={sortOpen}
          onClick={() => onSortOpen(!sortOpen)}
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
                onClick={() => {
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
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeLinhVucSlug, setActiveLinhVucSlug] = useState<string | null>(
    null,
  );
  const [view, setView] = useState<FeedView>("feed");
  const [sort, setSort] = useState<(typeof WORLD_JOURNEY_SORT_OPTIONS)[number]>(
    WORLD_JOURNEY_SORT_OPTIONS[0],
  );
  const [sortOpen, setSortOpen] = useState(false);

  const activeChip = findWorldJourneyFilterChip(filterChips, activeFilter);
  /* 1 feed duy nhất: bài từ người đang theo dõi xếp trên, rồi tới bài Khám phá
     (khử trùng lặp theo id). */
  const sourceMilestones = useMemo(() => {
    if (exploreMilestones === undefined) return milestones;
    const seen = new Set(milestones.map((m) => m.id));
    const exploreExtra = exploreMilestones.filter((m) => !seen.has(m.id));
    return [...milestones, ...exploreExtra];
  }, [milestones, exploreMilestones]);
  const visibleMilestones = useMemo(
    () =>
      sourceMilestones.filter(
        (milestone) =>
          worldJourneyMilestoneMatchesFilter(milestone, activeChip) &&
          worldJourneyMilestoneMatchesLinhVuc(milestone, activeLinhVucSlug),
      ),
    [sourceMilestones, activeChip, activeLinhVucSlug],
  );

  const galleryItems = useMemo(
    () => worldJourneyMilestonesToGalleryItems(visibleMilestones),
    [visibleMilestones],
  );

  return (
    <JourneyViewProvider initialView="journey" slug={sidebarProfile.slug}>
      <div
        className="world-journey-home cins-journey-page"
        aria-label="World Journey"
      >
        <header className="wj-feed-header">
          <WorldJourneyFilterBar
            chips={filterChips}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            view={view}
            onView={setView}
            sort={sort}
            onSort={setSort}
            sortOpen={sortOpen}
            onSortOpen={setSortOpen}
          />
        </header>

        <div className={`wj-shell${view === "grid" ? " view-grid" : ""}`}>
          {leftAside ?? (
            <WorldJourneyGuestLeftAside
              linhVucs={linhVucs}
              activeLinhVucSlug={activeLinhVucSlug}
              onLinhVucFilter={setActiveLinhVucSlug}
            />
          )}

          <div className={`wj-feed${view === "grid" ? " view-grid" : ""}`}>
            {pendingConfirmations}
            <CinsFeedComposer
              ownerSlug={sidebarProfile.slug}
              ownerName={sidebarProfile.tenHienThi}
              avatarUrl={sidebarProfile.avatarUrl}
              layout="feed"
            />

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

        {rightAside ?? (view === "feed" ? <WorldJourneyGuestRightAside /> : null)}
      </div>
    </div>
    </JourneyViewProvider>
  );
}
