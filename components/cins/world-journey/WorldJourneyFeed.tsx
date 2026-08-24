"use client";

import {
  Clapperboard,
  House,
  LayoutDashboard,
  LayoutGrid,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { WorldJourneyFeedTimeline } from "@/components/cins/world-journey/WorldJourneyFeedTimeline";
import { WorldJourneyGuestLeftAside } from "@/components/cins/world-journey/WorldJourneyGuestLeftAside";
import { WorldJourneyGuestRightAside } from "@/components/cins/world-journey/WorldJourneyGuestRightAside";
import { useWorldJourneyAsideSwipe } from "@/components/cins/world-journey/useWorldJourneyAsideSwipe";
import { WorldJourneyOpenFeedVideoProvider } from "@/components/cins/world-journey/WorldJourneyOpenFeedVideoContext";
import { WorldJourneyVideoFeed } from "@/components/cins/world-journey/WorldJourneyVideoFeed";
import {
  WorldJourneyVideoListing,
  type VideoListingOpenPayload,
} from "@/components/cins/world-journey/WorldJourneyVideoListing";
import { VideoProcessingPoller } from "@/components/journey/VideoProcessingPoller";
import { JourneyGalleryGridView } from "@/components/journey/JourneyGalleryGridView";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
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
  WORLD_JOURNEY_TAB_PAN_MS,
  WORLD_JOURNEY_VIDEO_LISTING_PAGE_SIZE,
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
import { galleryItemFromFeedMilestone } from "@/lib/cins/worldJourneyMilestoneVideo";
import {
  pushVideoPlayUrl,
  readVideoPlayIdFromWindow,
  videoPlayHref,
} from "@/lib/cins/worldJourneyVideoUrl";

import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/journey/journey.css";
/* Inline unfold + bình luận dùng `.cins-post-view` — cùng CSS với journey layout / modal. */
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";
import "@/app/world-journey-feed.css";

type FeedSurfaceView = "journey" | "gallery" | "video" | "shop";

type GalleryCacheEntry = {
  items: GalleryMainItem[];
  hasMore: boolean;
  nextOffset: number;
};

function gallerySurfaceCacheKey(
  mode: "gallery" | "video",
  filter: string,
  source: FeedSourceFilter,
): string {
  /* Video Reels luôn source=all — không gắn feedSource vào key. */
  return mode === "video" ? "video|all" : `gallery|${filter}|${source}`;
}

function galleryCacheHasStreamVideos(entry: GalleryCacheEntry | undefined): boolean {
  return Boolean(entry?.items.some((item) => item.streamUid?.trim()));
}

const FEED_SURFACE_VIEWS: ReadonlySet<FeedSurfaceView> = new Set([
  "journey",
  "gallery",
  "video",
  "shop",
]);

type FeedNavTab =
  | { kind: "view"; id: FeedSurfaceView; label: string; icon: LucideIcon }
  | { kind: "link"; href: string; label: string; icon: LucideIcon };

const FEED_NAV_TABS: ReadonlyArray<FeedNavTab> = [
  { kind: "view", id: "journey", label: "Trang chủ", icon: House },
  { kind: "view", id: "gallery", label: "Gallery", icon: LayoutDashboard },
  { kind: "view", id: "video", label: "Video", icon: Clapperboard },
  { kind: "view", id: "shop", label: "Giỏ hàng", icon: ShoppingBag },
  { kind: "link", href: "/shopping", label: "Cửa hàng", icon: Store },
];

const SURFACE_PANE_ORDER: readonly FeedSurfaceView[] = [
  "journey",
  "gallery",
  "video",
  "shop",
];

type SurfacePaneSnapshot = {
  view: FeedSurfaceView;
  milestones: ReadonlyArray<MilestoneItem>;
  galleryRows: ReadonlyArray<GalleryMainItem>;
  galleryMore: boolean;
  galleryOffset: number;
  filterLoading: boolean;
  dir: 1 | -1;
};

/** Session Reels — đóng băng playlist lúc click, không dính list listing đang fetch. */
type ReelSession = {
  startId: string;
  items: GalleryMainItem[];
  hasMore: boolean;
  nextOffset: number;
};

function isStreamVideoItem(item: GalleryMainItem): boolean {
  return Boolean(item.streamUid?.trim());
}

function playlistStartingAt(
  list: readonly GalleryMainItem[],
  startId: string,
  clicked?: GalleryMainItem | null,
): GalleryMainItem[] {
  const stream = list.filter(isStreamVideoItem);
  const head =
    clicked && isStreamVideoItem(clicked) && clicked.id === startId
      ? clicked
      : stream.find((item) => item.id === startId) ?? null;
  if (!head) return stream;
  const rest = stream.filter((item) => item.id !== startId);
  return [head, ...rest];
}

function reelSessionFromPlayId(
  playId: string | null,
  list: readonly GalleryMainItem[] = [],
  hasMore = true,
  nextOffset = 0,
): ReelSession | null {
  if (!playId) return null;
  return {
    startId: playId,
    items: playlistStartingAt(list, playId),
    hasMore,
    nextOffset,
  };
}

function surfacePaneIndex(view: FeedSurfaceView): number {
  const i = SURFACE_PANE_ORDER.indexOf(view);
  return i < 0 ? 0 : i;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function connectionSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (conn?.saveData) return true;
  return conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g";
}

function parseFeedSurfaceView(raw: string | null): FeedSurfaceView | null {
  if (!raw) return null;
  return FEED_SURFACE_VIEWS.has(raw as FeedSurfaceView)
    ? (raw as FeedSurfaceView)
    : null;
}
type OpenAside = "left" | "right" | null;

function feedViewFromSearch(search: string): FeedSurfaceView {
  return parseFeedSurfaceView(new URLSearchParams(search).get("view")) ?? "journey";
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
    return parseFeedSurfaceView(params.get("view")) ?? "journey";
  }
  return surfaceFromLayout(readHomeFeedLayout());
}

function feedViewHref(view: FeedSurfaceView, playId?: string | null): string {
  if (typeof window === "undefined") {
    if (view === "journey") return "/";
    if (view === "video" && playId) {
      return `/?view=video&play=${encodeURIComponent(playId)}`;
    }
    return `/?view=${view}`;
  }
  if (view === "video" && playId) return videoPlayHref(playId);
  const url = new URL(window.location.href);
  if (view === "journey") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  url.hash = "";
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
      <div
        className="wj-view-toggle"
        role="tablist"
        aria-label="Chế độ xem trang chủ"
      >
        {FEED_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          if (tab.kind === "link") {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="wj-vt-btn"
                aria-label={tab.label}
                title={tab.label}
                style={{ textDecoration: "none" }}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon size={22} strokeWidth={2.25} aria-hidden />
              </Link>
            );
          }
          const active = surfaceView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`wj-vt-btn${active ? " active" : ""}`}
              aria-label={tab.label}
              aria-selected={active}
              title={
                active ? "Cuộn lên đầu và tải nội dung mới" : tab.label
              }
              onClick={(e) => {
                e.stopPropagation();
                onSurfaceView(tab.id);
              }}
            >
              <Icon size={22} strokeWidth={2.25} aria-hidden />
            </button>
          );
        })}
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
  initialView,
  initialPlayId,
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
  /** Từ URL SSR — tránh đọc `window` lúc hydrate. */
  initialView?: string;
  initialPlayId?: string;
}) {
  const [surfaceView, setSurfaceView] = useState<FeedSurfaceView>(
    () => parseFeedSurfaceView(initialView ?? null) ?? "journey",
  );
  const [reelSession, setReelSession] = useState<ReelSession | null>(() =>
    reelSessionFromPlayId(
      initialPlayId?.trim() || null,
      galleryItems,
      galleryHasMore,
      galleryNextOffset,
    ),
  );
  const surfaceViewRef = useRef(surfaceView);
  const reelSessionRef = useRef(reelSession);
  const [openAside, setOpenAside] = useState<OpenAside>(null);
  const [backdropOn, setBackdropOn] = useState(false);
  const homeRootRef = useRef<HTMLDivElement | null>(null);
  const openAsideRef = useRef<OpenAside>(null);
  openAsideRef.current = openAside;

  useWorldJourneyAsideSwipe({
    rootRef: homeRootRef,
    openAsideRef,
    surfaceViewRef,
    setOpenAside,
  });

  const closeAside = useCallback(() => {
    setOpenAside(null);
  }, []);

  useEffect(() => {
    if (openAside) {
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setBackdropOn(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setBackdropOn(false);
  }, [openAside]);

  useEffect(() => {
    if (!openAside) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAside();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openAside, closeAside]);

  useEffect(() => {
    const mqDesktop = window.matchMedia("(min-width: 1200px)");
    const mqTablet = window.matchMedia("(min-width: 992px)");
    const sync = () => {
      setOpenAside((cur) => {
        if (!cur) return cur;
        if (mqDesktop.matches) return null;
        if (cur === "left" && mqTablet.matches) return null;
        return cur;
      });
    };
    mqDesktop.addEventListener("change", sync);
    mqTablet.addEventListener("change", sync);
    return () => {
      mqDesktop.removeEventListener("change", sync);
      mqTablet.removeEventListener("change", sync);
    };
  }, []);

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
  const activeFilterRef = useRef(activeFilter);
  const feedSourceRef = useRef(feedSource);
  /** Cache timeline journey/shop — đổi tab lại không chờ API nếu đã tải. */
  const timelineCacheRef = useRef<{
    journey?: {
      milestones: MilestoneItem[];
      hasMore: boolean;
      nextOffset: number;
    };
    shop?: {
      milestones: MilestoneItem[];
      hasMore: boolean;
      nextOffset: number;
    };
  }>({});
  /** Cache gallery/video theo filter+source — RAM session tab. */
  const galleryCacheRef = useRef<Record<string, GalleryCacheEntry>>({});
  /** Inflight dedupe prefetch / fetch gallery cùng key. */
  const galleryInflightRef = useRef<
    Map<string, Promise<GalleryCacheEntry | null>>
  >(new Map());
  /** Inflight dedupe prefetch timeline journey/shop. */
  const feedInflightRef = useRef<
    Map<string, Promise<{
      milestones: MilestoneItem[];
      hasMore: boolean;
      nextOffset: number;
    } | null>>
  >(new Map());
  const [exitPane, setExitPane] = useState<SurfacePaneSnapshot | null>(null);
  const paneSnapshotRef = useRef<{
    view: FeedSurfaceView;
    milestones: ReadonlyArray<MilestoneItem>;
    galleryRows: ReadonlyArray<GalleryMainItem>;
    galleryMore: boolean;
    galleryOffset: number;
    filterLoading: boolean;
  } | null>(null);
  const activeLinhVucSlugRef = useRef(activeLinhVucSlug);
  activeLinhVucSlugRef.current = activeLinhVucSlug;

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    nextOffsetRef.current = nextOffset;
  }, [nextOffset]);

  useEffect(() => {
    surfaceViewRef.current = surfaceView;
  }, [surfaceView]);

  useEffect(() => {
    reelSessionRef.current = reelSession;
  }, [reelSession]);

  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  useEffect(() => {
    feedSourceRef.current = feedSource;
  }, [feedSource]);

  /* Đổi nguồn / lĩnh vực / bộ lọc → cache cũ không còn đúng. */
  useEffect(() => {
    timelineCacheRef.current = {};
    galleryCacheRef.current = {};
  }, [activeFilter, feedSource, activeLinhVucSlug]);

  const loadGalleryPage = useCallback(
    async (
      cacheKey: string,
      qs: string,
    ): Promise<GalleryCacheEntry | null> => {
      const inflight = galleryInflightRef.current.get(cacheKey);
      if (inflight) return inflight;

      const promise = (async (): Promise<GalleryCacheEntry | null> => {
        try {
          const galleryRes = await fetch(
            `/api/world-journey/gallery?${qs}`,
          );
          if (!galleryRes.ok) return null;
          const galleryData = (await galleryRes.json()) as {
            items: GalleryMainItem[];
            hasMore: boolean;
            nextOffset: number;
          };
          const entry: GalleryCacheEntry = {
            items: galleryData.items,
            hasMore: galleryData.hasMore,
            nextOffset: galleryData.nextOffset,
          };
          galleryCacheRef.current[cacheKey] = entry;
          return entry;
        } catch {
          return null;
        } finally {
          galleryInflightRef.current.delete(cacheKey);
        }
      })();

      galleryInflightRef.current.set(cacheKey, promise);
      return promise;
    },
    [],
  );

  const loadTimelinePage = useCallback(
    async (
      view: "journey" | "shop",
      opts?: { force?: boolean },
    ): Promise<{
      milestones: MilestoneItem[];
      hasMore: boolean;
      nextOffset: number;
    } | null> => {
      if (!opts?.force && timelineCacheRef.current[view]?.milestones.length) {
        return timelineCacheRef.current[view] ?? null;
      }
      const inflightKey = `${view}|${activeFilterRef.current}|${feedSourceRef.current}|${activeLinhVucSlugRef.current ?? ""}`;
      const inflight = feedInflightRef.current.get(inflightKey);
      if (inflight) return inflight;

      const promise = (async () => {
        try {
          const qs = buildWorldJourneyFeedQuery({
            offset: 0,
            limit: WORLD_JOURNEY_FEED_PAGE_SIZE,
            filter: activeFilterRef.current,
            source: feedSourceRef.current,
            linhVuc: activeLinhVucSlugRef.current,
            shopOnly: view === "shop",
          });
          const res = await fetch(`/api/world-journey/feed?${qs}`);
          if (!res.ok) return null;
          const data = (await res.json()) as {
            milestones: MilestoneItem[];
            hasMore: boolean;
            nextOffset: number;
          };
          timelineCacheRef.current[view] = data;
          return data;
        } catch {
          return null;
        } finally {
          feedInflightRef.current.delete(inflightKey);
        }
      })();

      feedInflightRef.current.set(inflightKey, promise);
      return promise;
    },
    [],
  );

  const prefetchSurface = useCallback(
    async (view: FeedSurfaceView) => {
      if (view === "gallery") {
        const cacheKey = gallerySurfaceCacheKey(
          "gallery",
          activeFilterRef.current,
          feedSourceRef.current,
        );
        if (galleryCacheRef.current[cacheKey]?.items.length) return;
        const qs = buildWorldJourneyFeedQuery({
          offset: 0,
          limit: WORLD_JOURNEY_GALLERY_PAGE_SIZE,
          filter: activeFilterRef.current,
          source: feedSourceRef.current,
        });
        await loadGalleryPage(cacheKey, qs);
        return;
      }
      if (view === "video") {
        const cacheKey = gallerySurfaceCacheKey("video", "video", "all");
        if (galleryCacheHasStreamVideos(galleryCacheRef.current[cacheKey])) {
          return;
        }
        const qs = buildWorldJourneyFeedQuery({
          offset: 0,
          limit: WORLD_JOURNEY_VIDEO_LISTING_PAGE_SIZE,
          filter: "video",
          source: "all",
        });
        await loadGalleryPage(cacheKey, qs);
        return;
      }
      if (view === "shop" || view === "journey") {
        await loadTimelinePage(view);
      }
    },
    [loadGalleryPage, loadTimelinePage],
  );

  const reloadFromTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    setRefreshNonce((n) => n + 1);
  }, []);

  const closeVideoPlayer = useCallback(() => {
    if (window.history.state?.play) {
      window.history.back();
      return;
    }
    setReelSession(null);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "video");
    url.searchParams.delete("play");
    url.hash = "";
    const q = url.searchParams.toString();
    window.history.replaceState(
      { wjView: "video" },
      "",
      q ? `${url.pathname}?${q}` : url.pathname,
    );
  }, []);

  const openVideoPlayer = useCallback((payload: VideoListingOpenPayload) => {
    const startId = payload.item.id || payload.id;
    /* Giữ list listing để lúc đóng Reels không mất trang đã tải. */
    setGalleryRows(payload.items);
    setGalleryMore(payload.hasMore);
    setGalleryOffset(payload.nextOffset);
    setOpenAside(null);
    setSurfaceView("video");
    setReelSession({
      startId,
      items: playlistStartingAt(payload.items, startId, payload.item),
      hasMore: payload.hasMore,
      nextOffset: payload.nextOffset,
    });
    pushVideoPlayUrl(startId);
  }, []);

  const openVideoFromMilestone = useCallback(
    (milestone: MilestoneItem) => {
      const item = galleryItemFromFeedMilestone(milestone);
      if (!item) return;

      const prev = surfaceViewRef.current;
      if (prev === "journey" || prev === "shop") {
        timelineCacheRef.current[prev] = {
          milestones: feedMilestones,
          hasMore,
          nextOffset,
        };
      }

      const cacheKey = gallerySurfaceCacheKey("video", "video", "all");
      const cached = galleryCacheRef.current[cacheKey];
      const cachedItems = (cached?.items ?? []).filter(isStreamVideoItem);
      const items = cachedItems.some((row) => row.id === item.id)
        ? cachedItems
        : [item, ...cachedItems];

      openVideoPlayer({
        id: item.id,
        item,
        items,
        hasMore: cached?.hasMore ?? true,
        nextOffset: cached?.nextOffset ?? 0,
      });

      if (!galleryCacheHasStreamVideos(cached)) {
        void prefetchSurface("video");
      }
    },
    [feedMilestones, hasMore, nextOffset, openVideoPlayer, prefetchSurface],
  );

  const handleSurfaceView = useCallback(
    (next: FeedSurfaceView) => {
      if (surfaceViewRef.current === next) {
        if (next === "video" && reelSessionRef.current) {
          closeVideoPlayer();
          return;
        }
        reloadFromTop();
        return;
      }
      const prev = surfaceViewRef.current;
      /* Lưu snapshot timeline trước khi rời tab — lần sau restore tức thì. */
      if (prev === "journey" || prev === "shop") {
        timelineCacheRef.current[prev] = {
          milestones: feedMilestones,
          hasMore,
          nextOffset,
        };
      }
      if (prev === "gallery" || prev === "video") {
        const prevKey = gallerySurfaceCacheKey(
          prev,
          prev === "video" ? "video" : activeFilter,
          feedSource,
        );
        galleryCacheRef.current[prevKey] = {
          items: [...galleryRows],
          hasMore: galleryMore,
          nextOffset: galleryOffset,
        };
      }
      const snap = paneSnapshotRef.current;
      const skipPan =
        prefersReducedMotion() || Boolean(reelSessionRef.current);
      if (!skipPan && snap) {
        window.scrollTo(0, 0);
        const dir: 1 | -1 =
          surfacePaneIndex(next) > surfacePaneIndex(prev) ? 1 : -1;
        setExitPane({
          view: prev,
          milestones: snap.milestones,
          galleryRows: snap.galleryRows,
          galleryMore: snap.galleryMore,
          galleryOffset: snap.galleryOffset,
          filterLoading: false,
          dir,
        });
      } else {
        setExitPane(null);
      }
      if (next === "journey" || next === "shop") {
        const cached = timelineCacheRef.current[next];
        if (cached) {
          setFeedMilestones(cached.milestones);
          setHasMore(cached.hasMore);
          setNextOffset(cached.nextOffset);
          hasMoreRef.current = cached.hasMore;
          nextOffsetRef.current = cached.nextOffset;
          setFilterLoading(false);
        } else {
          /* Tránh giữ bài tab cũ trên UI trong lúc chờ fetch. */
          setFeedMilestones([]);
          setHasMore(false);
          setNextOffset(0);
          hasMoreRef.current = false;
          nextOffsetRef.current = 0;
          setFilterLoading(true);
        }
      }
      if (next === "gallery" || next === "video") {
        const nextKey = gallerySurfaceCacheKey(
          next,
          next === "video" ? "video" : activeFilter,
          feedSource,
        );
        const cached = galleryCacheRef.current[nextKey];
        const videoCacheOk =
          next !== "video" || galleryCacheHasStreamVideos(cached);
        if (cached && videoCacheOk) {
          setGalleryRows(cached.items);
          setGalleryMore(cached.hasMore);
          setGalleryOffset(cached.nextOffset);
          setFilterLoading(false);
        } else {
          /* Đổi tab Video: bỏ hàng ảnh gallery cũ — tránh Reels lọc streamUid → trống. */
          setGalleryRows([]);
          setGalleryMore(false);
          setGalleryOffset(0);
          setFilterLoading(true);
          if (next === "video") {
            delete galleryCacheRef.current[nextKey];
          }
        }
      }
      setOpenAside(null);
      setReelSession(null);
      setSurfaceView(next);
      window.history.pushState({ wjView: next }, "", feedViewHref(next));
    },
    [
      closeVideoPlayer,
      reloadFromTop,
      feedMilestones,
      hasMore,
      nextOffset,
      galleryRows,
      galleryMore,
      galleryOffset,
      activeFilter,
      feedSource,
    ],
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
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "store") {
      window.location.replace("/shopping");
      return;
    }
    setSurfaceView(initialSurfaceView(window.location.search));
    const playId = readVideoPlayIdFromWindow();
    const view = feedViewFromSearch(window.location.search);
    if (view === "video" && playId) {
      setReelSession((cur) => {
        if (cur?.startId === playId && cur.items.length > 0) return cur;
        return reelSessionFromPlayId(
          playId,
          galleryItems,
          galleryHasMore,
          galleryNextOffset,
        );
      });
    } else if (view !== "video") {
      setReelSession(null);
    }
    const onPop = () => {
      const next = feedViewFromSearch(window.location.search);
      const nextPlay = readVideoPlayIdFromWindow();
      if (next === "video" && nextPlay) {
        setReelSession((cur) => {
          if (cur?.startId === nextPlay && cur.items.length > 0) return cur;
          const cached =
            galleryCacheRef.current[
              gallerySurfaceCacheKey("video", "video", "all")
            ];
          return reelSessionFromPlayId(
            nextPlay,
            cached?.items ?? galleryItems,
            cached?.hasMore ?? galleryHasMore,
            cached?.nextOffset ?? galleryNextOffset,
          );
        });
      } else {
        setReelSession(null);
      }
      if (next === "journey" || next === "shop") {
        const cached = timelineCacheRef.current[next];
        if (cached) {
          setFeedMilestones(cached.milestones);
          setHasMore(cached.hasMore);
          setNextOffset(cached.nextOffset);
          hasMoreRef.current = cached.hasMore;
          nextOffsetRef.current = cached.nextOffset;
          setFilterLoading(false);
        } else {
          setFeedMilestones([]);
          setFilterLoading(true);
        }
      }
      if (next === "gallery" || next === "video") {
        const key = gallerySurfaceCacheKey(
          next,
          next === "video" ? "video" : activeFilterRef.current,
          feedSourceRef.current,
        );
        const cached = galleryCacheRef.current[key];
        if (cached) {
          setGalleryRows(cached.items);
          setGalleryMore(cached.hasMore);
          setGalleryOffset(cached.nextOffset);
          setFilterLoading(false);
        } else {
          setFilterLoading(true);
        }
      }
      setSurfaceView(next);
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
    /* Không ghi đè kết quả query filter / client fetch bằng props SSR trang đầu.
     * Journey SSR thường để galleryItems=[] (chỉ seed khi ?view=gallery|video) —
     * nếu sync khi đang xem Gallery/Video sẽ xóa lưới vừa fetch (trống giả). */
    if (
      filterLoading ||
      activeFilter !== "all" ||
      activeLinhVucSlug ||
      feedSource !== FEED_SOURCE_DEFAULT ||
      surfaceView === "shop" ||
      surfaceView === "gallery" ||
      surfaceView === "video"
    ) {
      return;
    }
    setFeedMilestones(mergePinnedOwnPublishes(milestones));
    setHasMore(feedHasMore);
    setNextOffset(feedNextOffset);
    hasMoreRef.current = feedHasMore;
    nextOffsetRef.current = feedNextOffset;
    /* Chỉ hydrate gallery từ SSR khi props có data (không đè cache client bằng []). */
    if (galleryItems.length > 0) {
      setGalleryRows(galleryItems);
      setGalleryMore(galleryHasMore);
      setGalleryOffset(galleryNextOffset);
    }
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
    surfaceView,
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
        shopOnly: surfaceViewRef.current === "shop",
      }),
    [activeFilter, feedSource, activeLinhVucSlug],
  );

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (loadingMoreRef.current || !hasMoreRef.current || filterLoading) {
      return false;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const prevOffset = nextOffsetRef.current;
      const res = await fetch(
        `/api/world-journey/feed?${feedQueryParams(prevOffset)}`,
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        milestones: MilestoneItem[];
        hasMore: boolean;
        nextOffset: number;
      };
      let addedCount = 0;
      setFeedMilestones((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const extra = data.milestones.filter((m) => !seen.has(m.id));
        addedCount = extra.length;
        return [...prev, ...extra];
      });
      hasMoreRef.current = data.hasMore;
      nextOffsetRef.current = data.nextOffset;
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
      /* Trang toàn bài trùng (đã có trong list) → độ dài không đổi nên observer
         không tự kích lại. Nếu offset vẫn tiến và còn dữ liệu, tự nạp trang kế
         để không kẹt giữa chừng (chỉ tiếp khi offset thực sự tăng → tránh loop). */
      if (
        addedCount === 0 &&
        data.hasMore &&
        data.nextOffset > prevOffset
      ) {
        loadingMoreRef.current = false;
        return loadMoreRef.current();
      }
      return data.hasMore;
    } catch {
      setLoadError(true);
      return false;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [feedQueryParams, filterLoading]);

  /* Ref để loadMore tự gọi lại (auto-advance) mà không đưa chính nó vào deps. */
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  /** Đổi bộ lọc / tab → query đúng surface (không double-fetch gallery). */
  useEffect(() => {
    /* SSR đã có timeline journey — bỏ qua fetch lần đầu; gallery SSR seed cache. */
    if (skipInitialFilterFetchRef.current) {
      skipInitialFilterFetchRef.current = false;
      if (surfaceView === "journey") {
        timelineCacheRef.current.journey = {
          milestones: feedMilestones,
          hasMore,
          nextOffset,
        };
        return;
      }
      if (surfaceView === "shop") {
        timelineCacheRef.current.shop = {
          milestones: feedMilestones,
          hasMore,
          nextOffset,
        };
        return;
      }
      if (
        (surfaceView === "gallery" || surfaceView === "video") &&
        galleryItems.length > 0
      ) {
        const seedKey = gallerySurfaceCacheKey(
          surfaceView,
          surfaceView === "video" ? "video" : activeFilter,
          feedSource,
        );
        galleryCacheRef.current[seedKey] = {
          items: [...galleryItems],
          hasMore: galleryHasMore,
          nextOffset: galleryNextOffset,
        };
        return;
      }
    }

    const epoch = ++filterQueryEpochRef.current;
    let cancelled = false;
    const isTimeline = surfaceView === "journey" || surfaceView === "shop";
    const isGallerySurface = surfaceView === "gallery";
    const isVideoSurface = surfaceView === "video";
    const galleryKey =
      isGallerySurface || isVideoSurface
        ? gallerySurfaceCacheKey(
            isVideoSurface ? "video" : "gallery",
            isVideoSurface ? "video" : activeFilter,
            feedSource,
          )
        : null;

    const hadTimelineCache =
      isTimeline &&
      Boolean(timelineCacheRef.current[surfaceView as "journey" | "shop"]);
    const cachedGallery =
      galleryKey != null ? galleryCacheRef.current[galleryKey] : undefined;
    const hadGalleryCache = isVideoSurface
      ? galleryCacheHasStreamVideos(cachedGallery)
      : Boolean(cachedGallery?.items.length);
    const hadCache = hadTimelineCache || hadGalleryCache;

    (async () => {
      /* Có cache → refresh nền, không blank UI. Chưa có ô → mới hiện searching. */
      if (!hadCache) setFilterLoading(true);
      setLoadError(false);
      loadingMoreRef.current = false;
      try {
        if (isGallerySurface || isVideoSurface) {
          if (!galleryKey) return;
          const galleryQs = buildWorldJourneyFeedQuery({
            offset: 0,
            limit: isVideoSurface
              ? WORLD_JOURNEY_VIDEO_LISTING_PAGE_SIZE
              : WORLD_JOURNEY_GALLERY_PAGE_SIZE,
            filter: isVideoSurface ? "video" : activeFilter,
            /* Reels không theo lọc nguồn localStorage (org-only → trống). */
            source: isVideoSurface ? "all" : feedSource,
          });
          const entry = await loadGalleryPage(galleryKey, galleryQs);
          if (cancelled || epoch !== filterQueryEpochRef.current) return;
          if (!entry) throw new Error("gallery fetch failed");
          setGalleryRows(entry.items);
          setGalleryMore(entry.hasMore);
          setGalleryOffset(entry.nextOffset);
          return;
        }

        if (!isTimeline) return;
        if (surfaceView !== "journey" && surfaceView !== "shop") return;

        const feedData = await loadTimelinePage(surfaceView, {
          force: hadTimelineCache,
        });
        if (cancelled || epoch !== filterQueryEpochRef.current) return;
        if (!feedData) throw new Error("filter fetch failed");
        setFeedMilestones(feedData.milestones);
        hasMoreRef.current = feedData.hasMore;
        nextOffsetRef.current = feedData.nextOffset;
        setHasMore(feedData.hasMore);
        setNextOffset(feedData.nextOffset);
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
    /* feedMilestones/hasMore/nextOffset chỉ seed cache lần đầu — không đưa vào deps. */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [
    activeFilter,
    feedSource,
    activeLinhVucSlug,
    refreshNonce,
    surfaceView,
    loadGalleryPage,
    loadTimelinePage,
  ]);

  /** Prefetch tab lân cận khi idle — đổi tab không chờ query trang đầu. */
  useEffect(() => {
    if (reelSession) return;
    if (connectionSaveData()) return;

    const idx = surfacePaneIndex(surfaceView);
    const others = SURFACE_PANE_ORDER.filter((view) => view !== surfaceView);
    others.sort(
      (a, b) =>
        Math.abs(surfacePaneIndex(a) - idx) -
        Math.abs(surfacePaneIndex(b) - idx),
    );

    let cancelled = false;
    const run = () => {
      if (cancelled || document.hidden) return;
      void (async () => {
        for (const view of others) {
          if (cancelled || document.hidden) return;
          await prefetchSurface(view);
        }
      })();
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;
    const cic = (
      window as Window & { cancelIdleCallback?: (id: number) => void }
    ).cancelIdleCallback;

    if (typeof ric === "function") {
      idleId = ric(run, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(run, 1200);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof cic === "function") cic(idleId);
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [
    surfaceView,
    activeFilter,
    feedSource,
    activeLinhVucSlug,
    reelSession,
    prefetchSurface,
  ]);

  useEffect(() => {
    if (!exitPane) return;
    const t = window.setTimeout(
      () => setExitPane(null),
      WORLD_JOURNEY_TAB_PAN_MS,
    );
    return () => window.clearTimeout(t);
  }, [exitPane, surfaceView]);

  /* Ổn định reference cho timeline: object/arrow mới mỗi render sẽ khiến
     IntersectionObserver bên trong bị hủy & tạo lại → prefetch ngừng ngẫu nhiên. */
  const handleLoadMore = useCallback(() => {
    void loadMore();
  }, [loadMore]);
  const scrollLoad = useMemo(
    () => (hasMore ? { enabled: true } : null),
    [hasMore],
  );

  const galleryEndpoint = useMemo(() => {
    const qs = buildWorldJourneyFeedQuery({
      limit: WORLD_JOURNEY_GALLERY_PAGE_SIZE,
      filter: activeFilter,
      source: feedSource,
    });
    return `/api/world-journey/gallery?${qs}`;
  }, [activeFilter, feedSource]);

  const videoEndpoint = useMemo(() => {
    const qs = buildWorldJourneyFeedQuery({
      limit: WORLD_JOURNEY_VIDEO_LISTING_PAGE_SIZE,
      filter: "video",
      source: "all",
    });
    return `/api/world-journey/gallery?${qs}`;
  }, []);

  const isGallery = surfaceView === "gallery";
  const isVideo = surfaceView === "video";
  const isVideoPlaying = isVideo && Boolean(reelSession);
  const isVideoListing = isVideo && !reelSession;

  paneSnapshotRef.current = {
    view: surfaceView,
    milestones: visibleMilestones,
    galleryRows,
    galleryMore,
    galleryOffset,
    filterLoading,
  };

  const renderSurfaceBody = (model: {
    view: FeedSurfaceView;
    milestones: ReadonlyArray<MilestoneItem>;
    galleryRows: ReadonlyArray<GalleryMainItem>;
    galleryMore: boolean;
    galleryOffset: number;
    filterLoading: boolean;
    interactive: boolean;
  }) => {
    const paneGallery = model.view === "gallery";
    const paneVideo = model.view === "video";
    const paneTimeline = model.view === "journey" || model.view === "shop";
    const paneShop = model.view === "shop";
    const showGallerySearching =
      model.filterLoading && model.galleryRows.length === 0;
    const showFeedSearching =
      model.filterLoading && model.milestones.length === 0;

    return (
      <>
        {paneTimeline ? (
          <CinsFeedComposer
            ownerSlug={sidebarProfile.slug}
            ownerName={sidebarProfile.tenHienThi}
            avatarUrl={sidebarProfile.avatarUrl}
            layout="feed"
          />
        ) : null}

        {paneVideo ? (
          showGallerySearching ? (
            <WorldJourneyFilterSearching surface="gallery" />
          ) : (
            <div
              className={
                "wj-video-feed-host" +
                (model.filterLoading && model.galleryRows.length > 0
                  ? " wj-gallery-revalidating"
                  : "")
              }
              aria-busy={model.filterLoading || undefined}
            >
              <WorldJourneyVideoListing
                key={
                  model.interactive
                    ? videoEndpoint
                    : `${videoEndpoint}:exit`
                }
                initialItems={model.galleryRows}
                hasMore={model.interactive ? galleryMore : model.galleryMore}
                nextOffset={
                  model.interactive ? galleryOffset : model.galleryOffset
                }
                endpoint={videoEndpoint}
                onOpenVideo={
                  model.interactive ? openVideoPlayer : () => undefined
                }
              />
            </div>
          )
        ) : paneGallery ? (
          showGallerySearching ? (
            <WorldJourneyFilterSearching surface="gallery" />
          ) : model.galleryRows.length === 0 && !model.galleryMore ? (
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
                    Dự án <strong>Nổi bật</strong> /{" "}
                    <strong>Công khai</strong> có media, bài cộng đồng, và{" "}
                    <strong>Showcase</strong> studio sẽ hiện ở đây.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div
              className={
                model.filterLoading ? "wj-gallery-revalidating" : undefined
              }
              aria-busy={model.filterLoading || undefined}
            >
              <JourneyGalleryGridView
                key={
                  model.interactive
                    ? galleryEndpoint
                    : `${galleryEndpoint}:exit`
                }
                hideToolbar
                sourceFilter={feedSource}
                initialItems={model.galleryRows}
                totalCount={model.galleryRows.length}
                scrollLoad={
                  model.interactive
                    ? {
                        ownerSlug: sidebarProfile.slug,
                        hasMore: galleryMore,
                        nextOffset: galleryOffset,
                        endpoint: galleryEndpoint,
                      }
                    : undefined
                }
              />
            </div>
          )
        ) : paneTimeline ? (
          showFeedSearching ? (
            <WorldJourneyFilterSearching surface="feed" />
          ) : model.milestones.length === 0 ? (
            <div className="wj-feed-empty">
              {paneShop ? (
                <ShoppingBag size={22} strokeWidth={1.8} aria-hidden />
              ) : (
                <Sparkles size={22} strokeWidth={1.8} aria-hidden />
              )}
              {paneShop ? (
                <>
                  <b>Chưa có bài gắn giỏ hàng</b>
                  <p>
                    Các bài đăng có sản phẩm mua ngay trên CINs sẽ hiện ở
                    đây.
                  </p>
                </>
              ) : activeFilter !== "all" ||
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
          ) : (
            <WorldJourneyFeedTimeline
              milestones={model.milestones}
              viewerProfileId={viewerProfileId}
              feedPromos={paneShop ? undefined : feedPromos}
              scrollLoad={model.interactive ? scrollLoad : null}
              loadingMore={model.interactive ? loadingMore : false}
              loadError={model.interactive ? loadError : false}
              onLoadMore={model.interactive ? handleLoadMore : () => undefined}
            />
          )
        ) : null}

        {paneTimeline &&
        model.milestones.length > 0 &&
        model.interactive &&
        !hasMore ? (
          <div className="wj-feed-end">
            <b>Đã hết nội dung mới</b>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <WorldJourneyOpenFeedVideoProvider value={openVideoFromMilestone}>
    <div
      ref={homeRootRef}
      className={
        "world-journey-home cins-journey-page" +
        (isGallery || isVideoListing ? " view-grid" : "") +
        (isVideoListing ? " view-video-list" : "") +
        (isVideoPlaying ? " view-video" : "")
      }
      aria-label="World Journey"
    >
      <button
        type="button"
        className={
          "wj-aside-drawer-backdrop" + (backdropOn ? " is-on" : "")
        }
        aria-label="Đóng cột sidebar"
        aria-hidden={!openAside}
        tabIndex={openAside ? 0 : -1}
        onClick={closeAside}
      />
      <div
        className="wj-shell"
        data-open-aside={openAside ?? undefined}
      >
        {leftAside ?? (
          <WorldJourneyGuestLeftAside
            linhVucs={linhVucs}
            activeLinhVucSlug={activeLinhVucSlug}
            onLinhVucFilter={setActiveLinhVucSlug}
          />
        )}

        <div
          className={
            "wj-feed" +
            (isGallery || isVideoListing ? " view-grid" : "") +
            (isVideoListing ? " view-video-list" : "") +
            (isVideoPlaying ? " view-video" : "")
          }
        >
          <header
            className="wj-feed-header"
            title="Cuộn lên đầu và tải nội dung mới"
            onClick={handleFeedHeaderClick}
            hidden={isVideoPlaying || undefined}
          >
            <span className="j-tlb-streak-slow" aria-hidden="true" />
            <WorldJourneyFilterBar
              surfaceView={surfaceView}
              onSurfaceView={handleSurfaceView}
            />
          </header>

          {pendingConfirmations}
          {isVideoPlaying && reelSession ? (
            <div
              className={
                "wj-video-feed-host" +
                (filterLoading && galleryRows.length > 0
                  ? " wj-gallery-revalidating"
                  : "")
              }
              aria-busy={filterLoading || undefined}
            >
              <WorldJourneyVideoFeed
                key={reelSession.startId}
                initialItems={reelSession.items}
                hasMore={reelSession.hasMore}
                nextOffset={reelSession.nextOffset}
                endpoint={videoEndpoint}
                startItemId={reelSession.startId}
                onClose={closeVideoPlayer}
              />
            </div>
          ) : (
            <div
              className="wj-feed-panes"
              style={
                {
                  "--wj-pan-dir": exitPane?.dir ?? 1,
                } as CSSProperties
              }
            >
              {exitPane ? (
                <div
                  className="wj-feed-pane wj-feed-pane--exit"
                  data-view={exitPane.view}
                  aria-hidden
                >
                  {renderSurfaceBody({
                    view: exitPane.view,
                    milestones: exitPane.milestones,
                    galleryRows: exitPane.galleryRows,
                    galleryMore: exitPane.galleryMore,
                    galleryOffset: exitPane.galleryOffset,
                    filterLoading: exitPane.filterLoading,
                    interactive: false,
                  })}
                </div>
              ) : null}
              <div
                className={
                  "wj-feed-pane wj-feed-pane--live" +
                  (exitPane ? " wj-feed-pane--enter" : "")
                }
                data-view={surfaceView}
              >
                {renderSurfaceBody({
                  view: surfaceView,
                  milestones: visibleMilestones,
                  galleryRows,
                  galleryMore,
                  galleryOffset,
                  filterLoading,
                  interactive: true,
                })}
              </div>
            </div>
          )}
        </div>

        {rightAside ?? <WorldJourneyGuestRightAside />}
      </div>
      <VideoProcessingPoller ownerSlug={sidebarProfile.slug} />
    </div>
    </WorldJourneyOpenFeedVideoProvider>
  );
}
