"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FeaturedFlagBadge } from "@/components/journey/FeaturedFlagBadge";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import {
  JourneyTimelineBar,
  type FilterGroup,
} from "@/components/journey/JourneyTimelineBar";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  buildFilterOptions,
  filterByGroup,
} from "@/lib/journey/milestone-filter-options";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";

type ScrollLoadConfig = {
  ownerSlug: string;
  hasMore: boolean;
  nextOffset: number;
  filterCounts?: MilestoneFilterCounts;
};

type Props = {
  initialItems?: ReadonlyArray<GalleryMainItem>;
  totalCount?: number;
  filterCounts?: MilestoneFilterCounts;
  scrollLoad?: ScrollLoadConfig;
  isOwner?: boolean;
  filterVisibility?: LoaiMocVisibilityMap;
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
  }>;
  items?: ReadonlyArray<{
    id: string;
    src: string;
    srcSet?: string;
    width?: number;
    height?: number;
    label: string;
    href?: string;
  }>;
};

export function JourneyGalleryGridView({
  initialItems,
  totalCount,
  filterCounts: filterCountsProp,
  scrollLoad,
  isOwner = false,
  filterVisibility,
  pinned = [],
  items = [],
}: Props) {
  const legacyAll =
    pinned.length > 0 || items.length > 0
      ? [
          ...pinned.map((item) => ({
            id: item.id,
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
          })),
          ...items.map((item) => ({
            id: item.id,
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
          })),
        ]
      : null;

  const [filter, setFilter] = useState<FilterGroup>("all");
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

  const filtered = useMemo(
    () => filterByGroup(galleryItems, filter),
    [galleryItems, filter],
  );

  const counts = scrollLoad?.filterCounts ?? filterCountsProp;
  const options = useMemo(
    () => buildFilterOptions(counts ?? { all: galleryItems.length, hoc: 0, lam: 0, "du-an": 0, "su-kien": 0, "thanh-tuu": 0, "ca-nhan": 0, bookmark: 0, verified: 0 }),
    [counts, galleryItems.length],
  );

  const totalVisible = filtered.length;
  const hasData = galleryItems.length > 0 || (totalCount ?? 0) > 0;
  const countLabel = `${totalCount ?? galleryItems.length} tác phẩm`;

  return (
    <main className="j-main-panel j-gallery-main" aria-label="Gallery tác phẩm">
      <JourneyTimelineBar
        year="Gallery"
        month={countLabel}
        filter={filter}
        onFilterChange={setFilter}
        options={options.map((o) =>
          o.group === filter ? { ...o, count: totalVisible } : o,
        )}
        enabled={hasData}
        isOwner={isOwner}
        filterVisibility={filterVisibility}
      />

      {!hasData ? (
        <div className="j-main-empty">
          Chưa có tác phẩm dạng ảnh. Các bài có cover public/feature sẽ hiện ở đây.
        </div>
      ) : filtered.length === 0 ? (
        <div className="j-main-empty">
          Không có tác phẩm thuộc nhóm <em>{filter}</em>. Đổi bộ lọc hoặc chọn “Tất cả”.
        </div>
      ) : (
        <div className="j-main-gallery-grid">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className={
                item.featured ? "j-main-gallery-item is-featured" : "j-main-gallery-item"
              }
            >
              {item.featured ? <FeaturedFlagBadge className="j-main-gallery-pin" /> : null}
              <JourneyCoverImage
                src={item.src}
                srcSet={item.srcSet}
                sizes={
                  item.srcSet
                    ? "(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
                    : undefined
                }
                width={item.width}
                height={item.height}
                alt={item.label}
                priority={item.featured}
              />
              <span className="j-main-gallery-info">
                <strong>{item.label}</strong>
                {item.meta ? <small>{item.meta}</small> : null}
              </span>
            </a>
          ))}
        </div>
      )}

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
    </main>
  );
}
