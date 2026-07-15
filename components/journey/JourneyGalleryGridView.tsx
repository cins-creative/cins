"use client";

import { Image as ImageIcon, Plus, Video } from "lucide-react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";

import { WorldBoostToggle } from "@/components/cins/world-journey/WorldBoostToggle";
import { useWorldBoostAdminOptional } from "@/components/cins/world-journey/WorldBoostAdminContext";
import { GalleryItemVisual, GalleryEmbedPlatformBadge, GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { GalleryMainHoverOverlay } from "@/components/journey/GalleryMainHoverOverlay";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { worldBoostTargetFromGalleryLike } from "@/lib/cins/world-boost-client";
import { GALLERY_GRID_IMAGE_SIZES } from "@/lib/cloudflare/cf-variant-url";
import { GalleryMediaFilterDropdown } from "@/components/journey/GalleryMediaFilterDropdown";
import { GalleryOrgCreateCardBody } from "@/components/journey/GalleryOrgCreateCardBody";
import { GalleryVerifiedBadge } from "@/components/journey/GalleryVerifiedBadge";
import {
  JourneyTimelineBar,
  type FilterGroup,
} from "@/components/journey/JourneyTimelineBar";
import { JourneySurfaceViewToggle } from "@/components/journey/JourneySurfaceViewToggle";
import { useJourneyViewOptional } from "@/components/journey/JourneyViewContext";
import { useJourneyPostOverlay } from "@/components/journey/useJourneyPostOverlay";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import {
  buildFilterOptions,
  computeFilterCounts,
  filterByGroup,
} from "@/lib/journey/milestone-filter-options";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";
import {
  galleryMediaFilterLabel,
  matchesGalleryMediaFilter,
  type GalleryMediaFilter,
} from "@/lib/journey/post-media";
import { matchesPersonalFilterSlug } from "@/lib/filter/client-utils";
import {
  matchesFeedSource,
  type FeedSourceFilter,
} from "@/lib/cins/worldJourneyFeedSource";
import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
import { useJourneyFilterShareOptional } from "@/components/journey/JourneyFilterShareContext";
import {
  galleryDisplayFromSearch,
  type GalleryDisplay,
} from "@/lib/journey/gallery-display-url";
import {
  buildGalleryGroupFilterSearchUrl,
  galleryGroupFromSearch,
} from "@/lib/journey/gallery-filter-share";
import { useGalleryMasonryAspects } from "@/components/journey/useGalleryMasonryAspects";
import { useBalancedMasonryColumns } from "@/components/journey/useBalancedMasonryColumns";
import { useGalleryPortraitVideoIds } from "@/components/journey/useGalleryPortraitVideoIds";

/** Chế độ xem gallery: `card` (mặc định, có bảng thông tin trắng dưới ảnh) hoặc
 *  `grid` (lưới gọn, thông tin hiện khi hover). URL: `?view=gallery` · `?view=gallery&display=luoi`. */
type GalleryViewMode = GalleryDisplay;

type ScrollLoadConfig = {
  ownerSlug: string;
  hasMore: boolean;
  nextOffset: number;
  filterCounts?: MilestoneFilterCounts;
  /** Override API — mặc định `/api/journey/:slug/gallery`. */
  endpoint?: string;
};

type Props = {
  initialItems?: ReadonlyArray<GalleryMainItem>;
  totalCount?: number;
  scrollLoad?: ScrollLoadConfig;
  isOwner?: boolean;
  filterVisibility?: LoaiMocVisibilityMap;
  /** Ẩn toolbar filter — dùng khi filter nằm ngoài (World Journey home). */
  hideToolbar?: boolean;
  /**
   * Lọc theo nguồn nội dung (World Journey home) — áp cho cả item tải thêm khi
   * cuộn. Mặc định `"all"` (không lọc) để không ảnh hưởng trang profile.
   */
  sourceFilter?: FeedSourceFilter;
  /** Legacy — pinned + grid tách (aside / mock). Không dùng cùng scrollLoad. */
  pinned?: ReadonlyArray<{
    id: string;
    src: string;
    srcSet?: string;
    width?: number;
    height?: number;
    title: string;
    href?: string;
    meta: string;
    mediaKind?: GalleryMainItem["mediaKind"];
  }>;
  items?: ReadonlyArray<{
    id: string;
    src: string;
    srcSet?: string;
    width?: number;
    height?: number;
    label: string;
    href?: string;
    mediaKind?: GalleryMainItem["mediaKind"];
  }>;
};

function isOrgCreateGalleryItem(item: GalleryMainItem): boolean {
  return (
    item.cardLayout === "cong-dong-create" ||
    item.cardLayout === "co-so-create" ||
    item.cardLayout === "studio-create"
  );
}

function galleryItemClassName(item: {
  featured: boolean;
  variant: GalleryMainItem["variant"];
  cardLayout?: GalleryMainItem["cardLayout"];
}): string {
  return [
    "j-main-gallery-item",
    item.featured ? "is-featured" : "",
    item.cardLayout === "cong-dong-create" ? "is-org-create is-cong-dong" : "",
    item.cardLayout === "co-so-create" ? "is-org-create is-co-so" : "",
    item.cardLayout === "studio-create" ? "is-org-create is-studio" : "",
    item.variant === "verified" && !item.cardLayout ? "is-verified" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type GalleryItemTileLayout = "grid" | "portrait-rail" | "masonry";

function GalleryMainItemTile({
  item,
  onOpenPost,
  layout = "grid",
  thumbAspect,
}: {
  item: GalleryMainItem;
  onOpenPost: (cotMocId: string) => void;
  layout?: GalleryItemTileLayout;
  thumbAspect?: number;
}) {
  const isOrgCreate = isOrgCreateGalleryItem(item);
  const worldBoostAdmin = useWorldBoostAdminOptional();
  const boostTarget = worldBoostTargetFromGalleryLike(item);
  const className = [
    galleryItemClassName(item),
    layout === "portrait-rail" ? "is-portrait-rail" : "",
    item.worldBoosted ||
    (boostTarget &&
      worldBoostAdmin?.isBoosted(boostTarget.loai, boostTarget.id))
      ? "is-world-boosted"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const viewLabel =
    item.variant === "verified"
      ? `Xem ${item.label} (đã xác thực)`
      : `Xem ${item.label}`;
  const thumbStyle =
    layout === "portrait-rail"
      ? { aspectRatio: String(thumbAspect ?? 9 / 16) }
      : layout === "masonry"
        ? { aspectRatio: String(thumbAspect ?? 16 / 9) }
        : undefined;

  const boostToggle =
    worldBoostAdmin?.canBoost && boostTarget ? (
      <WorldBoostToggle
        loai={boostTarget.loai}
        id={boostTarget.id}
        compact
        className="j-main-gallery-boost"
      />
    ) : null;

  const body = isOrgCreate ? (
    <GalleryOrgCreateCardBody
      layout={
        item.cardLayout as
          | "cong-dong-create"
          | "co-so-create"
          | "studio-create"
      }
      label={item.label}
      kicker={item.orgKicker}
      description={item.meta}
      coverSrc={item.src || undefined}
      orgAvatarUrl={item.orgAvatarUrl}
      featured={item.featured}
    />
  ) : (
    <>
      <div className="j-main-gallery-thumb" style={thumbStyle}>
        <GalleryItemVisual
          src={item.src}
          srcSet={item.srcSet}
          sizes={item.srcSet ? GALLERY_GRID_IMAGE_SIZES : undefined}
          width={item.width}
          height={item.height}
          alt={item.label}
          priority={item.featured}
          isVideo={item.isVideo || item.mediaKind === "video"}
          videoProcessing={item.videoProcessing}
          videoPreviewSrc={item.videoPreviewSrc}
        />
        {item.isVideo || item.mediaKind === "video" ? (
          <GalleryVideoPlayBadge />
        ) : null}
        {item.mediaKind === "embed" && item.embedProvider ? (
          <GalleryEmbedPlatformBadge provider={item.embedProvider} />
        ) : null}
        {item.variant === "verified" ? (
          <GalleryVerifiedBadge cotMocId={item.cotMocId} />
        ) : null}
        {boostToggle}
      </div>
      <GalleryMainHoverOverlay
        label={item.label}
        meta={item.meta}
        authorName={item.authorName}
        authorAvatarUrl={item.authorAvatarUrl}
      />
      <span className="j-main-gallery-info-panel">
        <strong className="j-main-gallery-info-title">{item.label}</strong>
        {item.meta ? (
          <small className="j-main-gallery-info-excerpt">{item.meta}</small>
        ) : null}
      </span>
    </>
  );

  if (isOrgCreate && item.href) {
    return (
      <Link
        href={item.href}
        className={className}
        prefetch={false}
        aria-label={viewLabel}
      >
        {body}
      </Link>
    );
  }

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={className}
        prefetch={false}
        aria-label={viewLabel}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpenPost(item.cotMocId)}
      aria-label={viewLabel}
    >
      {body}
    </button>
  );
}

export function JourneyGalleryGridView({
  initialItems,
  totalCount,
  scrollLoad,
  isOwner = false,
  filterVisibility,
  hideToolbar = false,
  sourceFilter = "all",
  pinned = [],
  items = [],
}: Props) {
  const personalFilter = useJourneyPersonalFilterOptional();
  const filterShare = useJourneyFilterShareOptional();
  const journeyView = useJourneyViewOptional();
  const { openPost, overlay } = useJourneyPostOverlay();
  const router = useRouter();
  const searchParams = useSearchParams();
  const compose = useJourneyCompose();
  const composeOwnerSlug = compose.ownerSlug || scrollLoad?.ownerSlug || "";
  const galleryOwnerSlug = scrollLoad?.ownerSlug || composeOwnerSlug;
  const gallerySearch = searchParams?.toString() ?? "";
  const urlDisplay: GalleryViewMode = galleryDisplayFromSearch(gallerySearch);
  const [displayView, setDisplayView] = useState<GalleryViewMode>(urlDisplay);
  const createPhotoInputRef = useRef<HTMLInputElement>(null);
  const createVideoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayView(urlDisplay);
  }, [urlDisplay]);

  useEffect(() => {
    const syncFromLocation = () => {
      setDisplayView(galleryDisplayFromSearch(window.location.search));
    };
    const onDisplayEvent = (event: Event) => {
      const detail = (event as CustomEvent<GalleryDisplay>).detail;
      if (detail === "card" || detail === "grid") setDisplayView(detail);
    };
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("cins:gallery-display", onDisplayEvent);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("cins:gallery-display", onDisplayEvent);
    };
  }, []);

  const openComposeMinimal = useCallback(() => {
    if (compose.canCompose) {
      compose.openCompose({ kind: "article", intent: "minimal" });
      return;
    }
    if (composeOwnerSlug) router.push(`/${composeOwnerSlug}/p/new`);
  }, [compose, composeOwnerSlug, router]);

  const onCreatePhotoPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      if (files.length === 0) return;
      if (compose.canCompose) {
        compose.openComposeWithPhotos(files);
        return;
      }
      if (composeOwnerSlug) router.push(`/${composeOwnerSlug}/p/new/photo`);
    },
    [compose, composeOwnerSlug, router],
  );

  const onCreateVideoPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (compose.canCompose) {
        compose.openComposeWithVideo(file);
        return;
      }
      if (composeOwnerSlug) router.push(`/${composeOwnerSlug}/p/new/video`);
    },
    [compose, composeOwnerSlug, router],
  );
  const legacyAll =
    pinned.length > 0 || items.length > 0
      ? [
          ...pinned.map((item) => ({
            id: item.id,
            cotMocId: item.id.replace(/^pin-/, "").split("-")[0] ?? item.id,
            src: item.src,
            srcSet: item.srcSet,
            width: item.width,
            height: item.height,
            label: item.title,
            href: item.href,
            meta: item.meta,
            featured: true,
            type: "du-an" as const,
            variant: "self" as const,
            mediaKind: item.mediaKind,
          })),
          ...items.map((item) => ({
            id: item.id,
            cotMocId: item.id.replace(/^grid-/, "").split("-")[0] ?? item.id,
            src: item.src,
            srcSet: item.srcSet,
            width: item.width,
            height: item.height,
            label: item.label,
            href: item.href,
            meta: "",
            featured: false,
            type: "du-an" as const,
            variant: "self" as const,
            mediaKind: item.mediaKind,
          })),
        ]
      : null;

  const [typeFilter, setTypeFilter] = useState<FilterGroup>(() => {
    if (typeof window === "undefined") return "all";
    return galleryGroupFromSearch(window.location.search) ?? "all";
  });
  const handleTypeFilterChange = useCallback((group: FilterGroup) => {
    setTypeFilter(group);
    if (typeof window === "undefined") return;
    const href = buildGalleryGroupFilterSearchUrl(
      window.location.pathname,
      window.location.search,
      group,
    );
    window.history.replaceState(window.history.state, "", href);
  }, []);
  const [mediaFilter, setMediaFilter] = useState<GalleryMediaFilter>("all");
  const effectiveView: GalleryViewMode = hideToolbar ? "grid" : displayView;
  const [galleryItems, setGalleryItems] = useState<GalleryMainItem[]>(() =>
    legacyAll ? [...legacyAll] : [...(initialItems ?? [])],
  );
  const [hasMore, setHasMore] = useState(scrollLoad?.hasMore ?? false);
  const [nextOffset, setNextOffset] = useState(
    scrollLoad?.nextOffset ?? (initialItems?.length ?? 0),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (legacyAll) return;
    setGalleryItems([...(initialItems ?? [])]);
    setHasMore(scrollLoad?.hasMore ?? false);
    setNextOffset(scrollLoad?.nextOffset ?? (initialItems?.length ?? 0));
    setLoadError(false);
  }, [initialItems, scrollLoad?.hasMore, scrollLoad?.nextOffset, legacyAll]);

  useEffect(() => {
    filterShare?.registerGalleryItems(galleryItems);
    return () => {
      filterShare?.registerGalleryItems([]);
    };
  }, [filterShare, galleryItems]);

  useEffect(() => {
    filterShare?.registerGalleryDisplay(displayView);
  }, [filterShare, displayView]);

  useEffect(() => {
    if (personalFilter?.activeSlug) {
      setTypeFilter("all");
      return;
    }
    const group = galleryGroupFromSearch(gallerySearch);
    if (group) setTypeFilter(group);
  }, [gallerySearch, personalFilter?.activeSlug]);

  const loadMore = useCallback(async () => {
    if (!scrollLoad || loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const endpoint =
        scrollLoad.endpoint ??
        `/api/journey/${encodeURIComponent(scrollLoad.ownerSlug)}/gallery`;
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${endpoint}${sep}offset=${nextOffset}`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        items: GalleryMainItem[];
        hasMore: boolean;
        nextOffset: number;
      };
      setGalleryItems((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const extra = data.items.filter((m) => !seen.has(m.id));
        return [...prev, ...extra];
      });
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [scrollLoad, hasMore, nextOffset]);

  useEffect(() => {
    if (!scrollLoad || !hasMore || legacyAll) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "480px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollLoad, hasMore, loadMore, galleryItems.length, legacyAll]);

  const visibleItems = galleryItems;

  const baseForTypeCounts = useMemo(() => {
    return visibleItems.filter((item) => {
      if (!matchesFeedSource(item, sourceFilter)) return false;
      if (!matchesGalleryMediaFilter(item.mediaKind, mediaFilter)) return false;
      if (
        personalFilter?.activeSlug &&
        !matchesPersonalFilterSlug(item.personalFilterSlugs, personalFilter.activeSlug)
      ) {
        return false;
      }
      return true;
    });
  }, [visibleItems, sourceFilter, mediaFilter, personalFilter?.activeSlug]);

  const typeCounts = useMemo((): MilestoneFilterCounts => {
    if (scrollLoad?.filterCounts && mediaFilter === "all" && !personalFilter?.activeSlug) {
      return scrollLoad.filterCounts;
    }
    return computeFilterCounts(baseForTypeCounts);
  }, [
    scrollLoad?.filterCounts,
    mediaFilter,
    personalFilter?.activeSlug,
    baseForTypeCounts,
  ]);

  const filtered = useMemo(() => {
    let rows = visibleItems.filter((item) =>
      matchesFeedSource(item, sourceFilter),
    );
    if (personalFilter?.activeSlug) {
      rows = rows.filter((item) =>
        matchesPersonalFilterSlug(item.personalFilterSlugs, personalFilter.activeSlug),
      );
    }
    rows = filterByGroup(rows, typeFilter);
    return rows.filter((item) => matchesGalleryMediaFilter(item.mediaKind, mediaFilter));
  }, [visibleItems, sourceFilter, typeFilter, mediaFilter, personalFilter?.activeSlug]);

  const showPortraitRail = effectiveView === "card" && !hideToolbar;
  const showMasonry = effectiveView === "grid";
  const { portraitIds, aspectById } = useGalleryPortraitVideoIds(
    filtered,
    showPortraitRail,
  );

  const { portraitRailItems, mainGridItems } = useMemo(() => {
    if (!showPortraitRail) {
      return {
        portraitRailItems: [] as GalleryMainItem[],
        mainGridItems: filtered,
      };
    }
    const rail: GalleryMainItem[] = [];
    const grid: GalleryMainItem[] = [];
    for (const item of filtered) {
      if (portraitIds.has(item.id)) {
        rail.push(item);
      } else {
        grid.push(item);
      }
    }
    return { portraitRailItems: rail, mainGridItems: grid };
  }, [filtered, showPortraitRail, portraitIds]);

  const masonryAspectById = useGalleryMasonryAspects(mainGridItems, showMasonry);
  const masonryProfile = hideToolbar ? "world-journey" : "gallery";
  const {
    containerRef: masonryContainerRef,
    columns: masonryColumns,
    columnCount: masonryColumnCount,
  } = useBalancedMasonryColumns(
    mainGridItems,
    masonryAspectById,
    showMasonry,
    masonryProfile,
  );

  const activePersonalFilter = personalFilter?.activeSlug
    ? personalFilter.filters.find((f) => f.slug === personalFilter.activeSlug)
    : null;

  const hasData = visibleItems.length > 0 || (totalCount ?? 0) > 0;
  const filterCount = filtered.length;

  const typeOptions = buildFilterOptions(typeCounts).map((o) =>
    o.group === typeFilter ? { ...o, count: filterCount } : o,
  );

  const showCreateTile = isOwner && Boolean(composeOwnerSlug);
  const createTile = showCreateTile ? (
    <div
      className="j-main-gallery-item j-main-gallery-create"
      data-cursor-element-id="gallery-create-tile"
    >
      <button
        type="button"
        className="j-main-gallery-create-main"
        onClick={openComposeMinimal}
      >
        <span className="j-main-gallery-create-plus" aria-hidden>
          <Plus size={20} strokeWidth={2.4} />
        </span>
        <span className="j-main-gallery-create-label">Thêm bài viết</span>
      </button>
      <div className="j-main-gallery-create-actions">
        <button
          type="button"
          aria-label="Thêm ảnh"
          onClick={() => createPhotoInputRef.current?.click()}
        >
          <ImageIcon size={16} />
        </button>
        <button
          type="button"
          aria-label="Thêm video"
          onClick={() => createVideoInputRef.current?.click()}
        >
          <Video size={16} />
        </button>
      </div>
      <input
        ref={createPhotoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={onCreatePhotoPick}
      />
      <input
        ref={createVideoInputRef}
        type="file"
        accept="video/*"
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={onCreateVideoPick}
      />
    </div>
  ) : null;

  const emptyFilterLabel = activePersonalFilter?.ten
    ? `${activePersonalFilter.ten}${mediaFilter !== "all" ? ` · ${galleryMediaFilterLabel(mediaFilter)}` : ""}`
    : mediaFilter !== "all"
      ? galleryMediaFilterLabel(mediaFilter)
      : typeFilter === "all"
        ? "Nhãn"
        : typeOptions.find((o) => o.group === typeFilter)?.label ?? "đã chọn";

  return (
    <div
      className={
        hideToolbar ? "wj-feed-grid-panel" : "j-main-panel j-gallery-main"
      }
      aria-label="Gallery tác phẩm"
    >
      {!hideToolbar ? (
        <div className="j-tlb">
          <span className="j-tlb-streak-slow" aria-hidden="true" />
          <div className="j-tlb-year">Gallery</div>
          <div className="j-tlb-month" aria-hidden style={{ visibility: "hidden" }}>
            —
          </div>
          {hasData || journeyView ? (
            <div className="j-tlb-filters">
              {hasData ? (
                <>
                  <JourneyTimelineBar
                    embed
                    filter={typeFilter}
                    onFilterChange={handleTypeFilterChange}
                    options={typeOptions}
                    enabled={hasData}
                    isOwner={isOwner}
                    filterVisibility={filterVisibility}
                  />
                  <GalleryMediaFilterDropdown
                    filter={mediaFilter}
                    onFilterChange={setMediaFilter}
                    variant="toolbar"
                  />
                </>
              ) : null}
              {journeyView ? <JourneySurfaceViewToggle /> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!hasData && !showCreateTile ? (
        <div className="j-main-empty">
          Chưa có tác phẩm công khai. Ảnh, video và bài có cover sẽ hiện ở đây.
        </div>
      ) : filtered.length === 0 && !showCreateTile ? (
        <div className="j-main-empty">
          Không có tác phẩm thuộc loại{" "}
          <em>{emptyFilterLabel}</em>. Đổi bộ lọc hoặc chọn “Tất cả”.
        </div>
      ) : (
        <>
          {portraitRailItems.length > 0 ? (
            <div className="j-gallery-portrait-rail" aria-label="Video dọc">
              <div className="j-gallery-portrait-rail__track">
                {portraitRailItems.map((item) => (
                  <GalleryMainItemTile
                    key={item.id}
                    item={item}
                    onOpenPost={openPost}
                    layout="portrait-rail"
                    thumbAspect={aspectById.get(item.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div
            ref={showMasonry ? masonryContainerRef : undefined}
            className={`j-main-gallery-grid${
              effectiveView === "card"
                ? " j-main-gallery-grid--card"
                : " j-main-gallery-grid--masonry j-main-gallery-grid--masonry-balanced"
            }`}
            style={
              showMasonry
                ? ({ "--masonry-cols": masonryColumnCount } as CSSProperties)
                : undefined
            }
          >
            {showMasonry && masonryColumns ? (
              masonryColumns.length > 0 ? (
                masonryColumns.map((col, ci) => (
                  <div key={`mcol-${ci}`} className="j-main-gallery-grid__mcol">
                    {ci === 0 ? createTile : null}
                    {col.map(({ data: item }) => (
                      <GalleryMainItemTile
                        key={item.id}
                        item={item}
                        onOpenPost={openPost}
                        layout="masonry"
                        thumbAspect={masonryAspectById.get(item.id)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                createTile
              )
            ) : (
              <>
                {createTile}
                {mainGridItems.map((item) => (
                  <GalleryMainItemTile
                    key={item.id}
                    item={item}
                    onOpenPost={openPost}
                    layout={showMasonry ? "masonry" : "grid"}
                    thumbAspect={
                      showMasonry ? masonryAspectById.get(item.id) : undefined
                    }
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}

      {overlay}

      {scrollLoad && hasMore && !legacyAll ? (
        <div ref={sentinelRef} className="j-timeline-scroll-sentinel" aria-hidden />
      ) : null}

      {loadingMore ? (
        <div className="j-main-gallery-grid j-main-gallery-grid--loading" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="j-skel j-skel-main-gallery-item" />
          ))}
        </div>
      ) : null}

      {loadError ? (
        <div className="j-timeline-load-retry-wrap">
          <button
            type="button"
            className="j-timeline-load-retry"
            onClick={() => void loadMore()}
          >
            Không tải được thêm tác phẩm — thử lại
          </button>
        </div>
      ) : null}
    </div>
  );
}
