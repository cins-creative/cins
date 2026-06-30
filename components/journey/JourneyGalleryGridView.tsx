"use client";

import { Grid3x3, Image as ImageIcon, LayoutGrid, Plus, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { GalleryItemVisual, GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { GalleryMediaFilterDropdown } from "@/components/journey/GalleryMediaFilterDropdown";
import { GalleryOrgCreateCardBody } from "@/components/journey/GalleryOrgCreateCardBody";
import { GalleryVerifiedBadge } from "@/components/journey/GalleryVerifiedBadge";
import {
  JourneyTimelineBar,
  type FilterGroup,
} from "@/components/journey/JourneyTimelineBar";
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
  computeGalleryMediaFilterCounts,
  galleryMediaFilterLabel,
  matchesGalleryMediaFilter,
  type GalleryMediaFilter,
} from "@/lib/journey/post-media";
import { matchesPersonalFilterSlug } from "@/lib/filter/client-utils";
import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";

/** Chế độ xem gallery: `card` (mặc định, có bảng thông tin trắng dưới ảnh) hoặc
 *  `grid` (lưới gọn, thông tin hiện khi hover). */
type GalleryViewMode = "card" | "grid";

type ScrollLoadConfig = {
  ownerSlug: string;
  hasMore: boolean;
  nextOffset: number;
  filterCounts?: MilestoneFilterCounts;
};

type Props = {
  initialItems?: ReadonlyArray<GalleryMainItem>;
  totalCount?: number;
  scrollLoad?: ScrollLoadConfig;
  isOwner?: boolean;
  filterVisibility?: LoaiMocVisibilityMap;
  /** Ẩn toolbar filter — dùng khi filter nằm ngoài (World Journey home). */
  hideToolbar?: boolean;
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

function isGalleryPostPermalink(href: string | undefined): href is string {
  return Boolean(href && /\/p\/[^/?#]+/.test(href));
}

function isOrgCreateGalleryItem(item: GalleryMainItem): boolean {
  return (
    item.cardLayout === "cong-dong-create" ||
    item.cardLayout === "co-so-create"
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
    item.variant === "verified" && !item.cardLayout ? "is-verified" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function JourneyGalleryGridView({
  initialItems,
  totalCount,
  scrollLoad,
  isOwner = false,
  filterVisibility,
  hideToolbar = false,
  pinned = [],
  items = [],
}: Props) {
  const personalFilter = useJourneyPersonalFilterOptional();
  const { openPost, overlay } = useJourneyPostOverlay();
  const router = useRouter();
  const compose = useJourneyCompose();
  const composeOwnerSlug = compose.ownerSlug || scrollLoad?.ownerSlug || "";
  const createPhotoInputRef = useRef<HTMLInputElement>(null);
  const createVideoInputRef = useRef<HTMLInputElement>(null);

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

  const [typeFilter, setTypeFilter] = useState<FilterGroup>("all");
  const [mediaFilter, setMediaFilter] = useState<GalleryMediaFilter>("all");
  // Lưới gọn mặc định; người dùng có thể chuyển sang dạng thẻ.
  const [view, setView] = useState<GalleryViewMode>("grid");
  const effectiveView: GalleryViewMode = hideToolbar ? "grid" : view;
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
    if (personalFilter?.activeSlug) setTypeFilter("all");
  }, [personalFilter?.activeSlug]);

  const loadMore = useCallback(async () => {
    if (!scrollLoad || loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/journey/${encodeURIComponent(scrollLoad.ownerSlug)}/gallery?offset=${nextOffset}`,
      );
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
      if (!matchesGalleryMediaFilter(item.mediaKind, mediaFilter)) return false;
      if (
        personalFilter?.activeSlug &&
        !matchesPersonalFilterSlug(item.personalFilterSlugs, personalFilter.activeSlug)
      ) {
        return false;
      }
      return true;
    });
  }, [visibleItems, mediaFilter, personalFilter?.activeSlug]);

  const baseForMediaCounts = useMemo(() => {
    let rows = visibleItems;
    if (personalFilter?.activeSlug) {
      rows = rows.filter((item) =>
        matchesPersonalFilterSlug(item.personalFilterSlugs, personalFilter.activeSlug),
      );
    }
    return filterByGroup(rows, typeFilter);
  }, [visibleItems, typeFilter, personalFilter?.activeSlug]);

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

  const mediaCounts = useMemo(
    () => computeGalleryMediaFilterCounts(baseForMediaCounts),
    [baseForMediaCounts],
  );

  const filtered = useMemo(() => {
    let rows = visibleItems;
    if (personalFilter?.activeSlug) {
      rows = rows.filter((item) =>
        matchesPersonalFilterSlug(item.personalFilterSlugs, personalFilter.activeSlug),
      );
    }
    rows = filterByGroup(rows, typeFilter);
    return rows.filter((item) => matchesGalleryMediaFilter(item.mediaKind, mediaFilter));
  }, [visibleItems, typeFilter, mediaFilter, personalFilter?.activeSlug]);

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
        ? "Tất cả"
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
          <div className="j-tlb-year">Gallery</div>
          <div className="j-tlb-month" aria-hidden style={{ visibility: "hidden" }}>
            —
          </div>
          {hasData ? (
            <div className="j-tlb-filters">
              <JourneyTimelineBar
                embed
                filter={typeFilter}
                onFilterChange={setTypeFilter}
                options={typeOptions}
                enabled={hasData}
                isOwner={isOwner}
                filterVisibility={filterVisibility}
              />
              <GalleryMediaFilterDropdown
                filter={mediaFilter}
                onFilterChange={setMediaFilter}
                variant="toolbar"
                count={filterCount}
                optionCounts={mediaCounts}
              />
              <div
                className="j-gallery-view-toggle"
                role="group"
                aria-label="Chế độ xem"
              >
                <button
                  type="button"
                  className={`j-gvt-btn${view === "card" ? " active" : ""}`}
                  aria-label="Dạng thẻ"
                  aria-pressed={view === "card"}
                  title="Dạng thẻ"
                  onClick={() => setView("card")}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  className={`j-gvt-btn${view === "grid" ? " active" : ""}`}
                  aria-label="Lưới gọn"
                  aria-pressed={view === "grid"}
                  title="Lưới gọn"
                  onClick={() => setView("grid")}
                >
                  <Grid3x3 size={15} />
                </button>
              </div>
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
        <div
          className={`j-main-gallery-grid${
            effectiveView === "card" ? " j-main-gallery-grid--card" : ""
          }`}
        >
          {createTile}
          {filtered.map((item) => {
            const className = galleryItemClassName(item);
            const isOrgCreate = isOrgCreateGalleryItem(item);
            const viewLabel =
              item.variant === "verified"
                ? `Xem ${item.label} (đã xác thực)`
                : `Xem ${item.label}`;
            const body = isOrgCreate ? (
              <GalleryOrgCreateCardBody
                layout={item.cardLayout as "cong-dong-create" | "co-so-create"}
                label={item.label}
                kicker={item.orgKicker}
                description={item.meta}
                coverSrc={item.src || undefined}
                orgAvatarUrl={item.orgAvatarUrl}
                featured={item.featured}
              />
            ) : (
              <>
                <div className="j-main-gallery-thumb">
                  <GalleryItemVisual
                    src={item.src}
                    srcSet={item.srcSet}
                    sizes={
                      item.srcSet
                        ? "(max-width: 575px) 33vw, (max-width: 991px) 50vw, 33vw"
                        : undefined
                    }
                    width={item.width}
                    height={item.height}
                    alt={item.label}
                    priority={item.featured}
                    isVideo={item.isVideo || item.mediaKind === "video"}
                    videoProcessing={item.videoProcessing}
                  />
                  {item.isVideo || item.mediaKind === "video" ? (
                    <GalleryVideoPlayBadge />
                  ) : null}
                  {item.variant === "verified" ? (
                    <GalleryVerifiedBadge cotMocId={item.cotMocId} />
                  ) : null}
                </div>
                <span className="j-main-gallery-overlay" aria-hidden>
                  <span className="j-main-gallery-overlay-body">
                    {item.authorName ? (
                      <span className="j-main-gallery-author">
                        {item.authorAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="j-main-gallery-author-avatar"
                            src={item.authorAvatarUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="j-main-gallery-author-avatar j-main-gallery-author-avatar--fallback">
                            {item.authorName.trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="j-main-gallery-author-name">
                          {item.authorName}
                        </span>
                      </span>
                    ) : null}
                    <strong className="j-main-gallery-overlay-title">
                      {item.label}
                    </strong>
                    {item.meta ? (
                      <small className="j-main-gallery-overlay-excerpt">
                        {item.meta}
                      </small>
                    ) : null}
                  </span>
                </span>
                {/* Bảng thông tin trắng — chỉ hiện ở chế độ thẻ (CSS). */}
                <span className="j-main-gallery-info-panel">
                  <strong className="j-main-gallery-info-title">
                    {item.label}
                  </strong>
                  {item.meta ? (
                    <small className="j-main-gallery-info-excerpt">
                      {item.meta}
                    </small>
                  ) : null}
                </span>
              </>
            );

            if (isOrgCreate && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={className}
                  prefetch={false}
                  aria-label={viewLabel}
                >
                  {body}
                </Link>
              );
            }

            if (isGalleryPostPermalink(item.href)) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={className}
                  prefetch={false}
                  scroll={false}
                  aria-label={viewLabel}
                >
                  {body}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                className={className}
                onClick={() => openPost(item.cotMocId)}
                aria-label={viewLabel}
              >
                {body}
              </button>
            );
          })}
        </div>
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
