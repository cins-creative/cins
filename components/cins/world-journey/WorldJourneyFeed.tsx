"use client";

import {
  ArrowDownNarrowWide,
  Check,
  ChevronDown,
  Compass,
  FileText,
  History,
  Image as ImageIcon,
  LayoutGrid,
  Rows3,
  Sparkles,
  UserRoundCheck,
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

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
import "@/app/world-journey-feed.css";

type FeedView = "feed" | "grid";
type FeedTab = "following" | "explore";

function WorldJourneyFeedTabs({
  tab,
  onTab,
}: {
  tab: FeedTab;
  onTab: (t: FeedTab) => void;
}) {
  return (
    <div className="wj-feed-tabs" role="tablist" aria-label="Nguồn feed">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "following"}
        className={tab === "following" ? "on" : undefined}
        onClick={() => onTab("following")}
      >
        <UserRoundCheck size={15} strokeWidth={2} aria-hidden />
        Đang theo dõi
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "explore"}
        className={tab === "explore" ? "on" : undefined}
        onClick={() => onTab("explore")}
      >
        <Compass size={15} strokeWidth={2} aria-hidden />
        Khám phá
      </button>
    </div>
  );
}

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

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) onSortOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [sortOpen, onSortOpen]);

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
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={`wj-fchip${activeFilter === chip.id ? " active" : ""}`}
          onClick={() => onFilter(chip.id)}
        >
          {chipIcon(chip.icon)}
          {chip.label}
        </button>
      ))}
      <span className="wj-filter-spacer" />
      <div className="wj-view-toggle" role="group" aria-label="Chế độ xem">
        <button
          type="button"
          className={`wj-vt-btn${view === "feed" ? " active" : ""}`}
          aria-label="Dòng thời gian"
          onClick={() => onView("feed")}
        >
          <Rows3 size={13} />
          <span>Dòng</span>
        </button>
        <button
          type="button"
          className={`wj-vt-btn${view === "grid" ? " active" : ""}`}
          aria-label="Lưới"
          onClick={() => onView("grid")}
        >
          <LayoutGrid size={13} />
          <span>Lưới</span>
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
}) {
  const hasExploreTab = exploreMilestones !== undefined;
  const [feedTab, setFeedTab] = useState<FeedTab>(() =>
    hasExploreTab && milestones.length === 0 ? "explore" : "following",
  );
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
  const sourceMilestones =
    hasExploreTab && feedTab === "explore"
      ? (exploreMilestones ?? [])
      : milestones;
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
          {hasExploreTab ? (
            <WorldJourneyFeedTabs tab={feedTab} onTab={setFeedTab} />
          ) : null}
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
                <b>
                  {feedTab === "explore" ? "Khám phá đang trống" : "Feed đang trống"}
                </b>
                <p>
                  {feedTab === "explore" ? (
                    <>
                      Bài <strong>Nổi bật</strong> từ cộng đồng sẽ hiện ở đây khi có
                      dữ liệu.
                    </>
                  ) : (
                    <>
                      Theo dõi vài người hoặc tổ chức — bài{" "}
                      <strong>Công khai</strong> / <strong>Nổi bật</strong> sẽ hiện
                      ở đây. Hoặc chuyển sang tab <strong>Khám phá</strong>.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <WorldJourneyFeedTimeline
                milestones={visibleMilestones}
                viewerProfileId={viewerProfileId}
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
