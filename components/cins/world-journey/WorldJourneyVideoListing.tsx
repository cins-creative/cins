"use client";

import { Clapperboard } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { GalleryItemVisual, GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { GalleryMainHoverOverlay } from "@/components/journey/GalleryMainHoverOverlay";
import { useBalancedMasonryColumns } from "@/components/journey/useBalancedMasonryColumns";
import { useGalleryMasonryAspects } from "@/components/journey/useGalleryMasonryAspects";
import { GALLERY_GRID_IMAGE_SIZES } from "@/lib/cloudflare/cf-variant-url";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";

export type VideoListingOpenPayload = {
  id: string;
  items: GalleryMainItem[];
  hasMore: boolean;
  nextOffset: number;
};

type Props = {
  initialItems?: ReadonlyArray<GalleryMainItem>;
  hasMore?: boolean;
  nextOffset?: number;
  endpoint: string;
  onOpenVideo: (payload: VideoListingOpenPayload) => void;
};

function isStreamVideoItem(item: GalleryMainItem): boolean {
  return Boolean(item.streamUid?.trim());
}

export function WorldJourneyVideoListing({
  initialItems = [],
  hasMore: initialHasMore = false,
  nextOffset: initialOffset = 0,
  endpoint,
  onOpenVideo,
}: Props) {
  const [items, setItems] = useState<GalleryMainItem[]>(() =>
    initialItems.filter(isStreamVideoItem),
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(initialItems.filter(isStreamVideoItem));
    setHasMore(initialHasMore);
    setOffset(initialOffset);
    setLoadError(false);
  }, [initialItems, initialHasMore, initialOffset]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("offset", String(offset));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        items?: GalleryMainItem[];
        hasMore?: boolean;
        nextOffset?: number;
      };
      const extra = (data.items ?? []).filter(isStreamVideoItem);
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...extra.filter((item) => !seen.has(item.id))];
      });
      const nextHasMore = Boolean(data.hasMore);
      const nextOff =
        typeof data.nextOffset === "number"
          ? data.nextOffset
          : offset + extra.length;
      setHasMore(nextHasMore);
      setOffset(nextOff);
    } catch {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [endpoint, hasMore, offset]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root: null, rootMargin: "480px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, items.length]);

  const aspectById = useGalleryMasonryAspects(items, true);
  const {
    containerRef,
    columns,
    columnCount,
  } = useBalancedMasonryColumns(
    items,
    aspectById,
    true,
    "world-journey-video",
  );

  if (items.length === 0 && !hasMore && !loadingMore) {
    return (
      <div className="wj-feed-empty">
        <Clapperboard size={22} strokeWidth={1.8} aria-hidden />
        <b>Chưa có video</b>
      </div>
    );
  }

  return (
    <div className="wj-feed-grid-panel" aria-label="Danh sách video">
      <div
        ref={containerRef}
        className="j-main-gallery-grid j-main-gallery-grid--masonry j-main-gallery-grid--masonry-balanced"
        style={{ "--masonry-cols": columnCount } as CSSProperties}
      >
        {columns?.map((col, ci) => (
          <div key={`mcol-${ci}`} className="j-main-gallery-grid__mcol">
            {col.map(({ data: item }) => (
              <VideoListingTile
                key={item.id}
                item={item}
                thumbAspect={aspectById.get(item.id)}
                onOpen={() =>
                  onOpenVideo({
                    id: item.id,
                    items,
                    hasMore,
                    nextOffset: offset,
                  })
                }
              />
            ))}
          </div>
        ))}
      </div>
      {hasMore ? (
        <div ref={sentinelRef} className="j-timeline-scroll-sentinel" aria-hidden />
      ) : null}
      {loadingMore ? (
        <div
          className="j-main-gallery-grid j-main-gallery-grid--loading"
          aria-busy="true"
        >
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
            Không tải được thêm video — thử lại
          </button>
        </div>
      ) : null}
    </div>
  );
}

function VideoListingTile({
  item,
  thumbAspect,
  onOpen,
}: {
  item: GalleryMainItem;
  thumbAspect?: number;
  onOpen: () => void;
}) {
  const visualSrc = item.masonrySrc?.trim() || item.src;
  const viewLabel = `Xem video ${item.label}`;

  return (
    <button
      type="button"
      className="j-main-gallery-item"
      onClick={(e) => {
        if (
          e.target instanceof Element &&
          e.target.closest(".j-user-pop-wrap")
        ) {
          return;
        }
        onOpen();
      }}
      aria-label={viewLabel}
    >
      <div
        className="j-main-gallery-thumb"
        style={{ aspectRatio: String(thumbAspect ?? 16 / 9) }}
      >
        <GalleryItemVisual
          src={visualSrc}
          sizes={GALLERY_GRID_IMAGE_SIZES}
          width={item.width}
          height={item.height}
          alt={item.label}
          isVideo
          videoProcessing={item.videoProcessing}
          videoPreviewSrc={item.videoPreviewSrc}
        />
        <GalleryVideoPlayBadge />
      </div>
      <GalleryMainHoverOverlay
        label={item.label}
        authorName={item.authorName}
        authorAvatarUrl={item.authorAvatarUrl}
        authorSlug={item.authorSlug}
      />
    </button>
  );
}
