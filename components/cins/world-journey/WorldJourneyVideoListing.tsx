"use client";

import { Clapperboard } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { GalleryAuthorRow } from "@/components/journey/GalleryMainHoverOverlay";
import { useBalancedMasonryColumns } from "@/components/journey/useBalancedMasonryColumns";
import { useGalleryMasonryAspects } from "@/components/journey/useGalleryMasonryAspects";
import { useWorldJourneyFeedAudio } from "@/components/cins/world-journey/WorldJourneyFeedAudioContext";
import { WorldJourneyVideoListingPlayer } from "@/components/cins/world-journey/WorldJourneyVideoListingPlayer";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";

export type VideoListingOpenPayload = {
  id: string;
  /** Ô vừa click — player dùng item này làm clip mở đầu, không lấy phần tử đầu listing. */
  item: GalleryMainItem;
  items: GalleryMainItem[];
  hasMore: boolean;
  nextOffset: number;
  /** Giữ đúng thứ tự list (rail) — không đưa clip click lên đầu, không load-more ngoài list. */
  lockPlaylist?: boolean;
  /** Xáo clip sau clip đang mở (và trang load-more) — dùng khi vào Reels từ rail. */
  shuffleUpcoming?: boolean;
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
  const tileElsRef = useRef(new Map<string, HTMLElement>());
  const snappedIdRef = useRef<string | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const { muted, toggleMuted } = useWorldJourneyFeedAudio();
  const [snappedId, setSnappedId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

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

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const pickSnapped = useCallback(() => {
    const vh = window.innerHeight;
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const [id, el] of tileElsRef.current) {
      const r = el.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible < 72) continue;
      const dist = Math.abs(r.bottom - vh);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    }
    const currentId = snappedIdRef.current;
    if (currentId && currentId === bestId) return;
    if (currentId && bestId && currentId !== bestId) {
      const currentEl = tileElsRef.current.get(currentId);
      if (currentEl) {
        const r = currentEl.getBoundingClientRect();
        const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        const currentDist = Math.abs(r.bottom - vh);
        if (visible >= 72 && currentDist <= bestDist + 48) {
          return;
        }
      }
    }
    snappedIdRef.current = bestId;
    setSnappedId(bestId);
    setPinnedId(null);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScrollOrResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        pickSnapped();
      });
    };
    const io = new IntersectionObserver(onScrollOrResize, {
      root: null,
      threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
    });
    ioRef.current = io;
    for (const el of tileElsRef.current.values()) io.observe(el);
    pickSnapped();
    window.addEventListener("scroll", onScrollOrResize, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      ioRef.current = null;
      io.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [items, pickSnapped]);

  const playingId = pinnedId ?? (reduceMotion ? null : snappedId);
  const bindTileEl = useCallback((id: string, el: HTMLElement | null) => {
    const prev = tileElsRef.current.get(id);
    if (prev && ioRef.current) ioRef.current.unobserve(prev);
    if (el) {
      tileElsRef.current.set(id, el);
      ioRef.current?.observe(el);
      pickSnapped();
    } else {
      tileElsRef.current.delete(id);
    }
  }, [pickSnapped]);

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
                active={playingId === item.id}
                muted={muted}
                onToggleMuted={toggleMuted}
                onActivate={() => setPinnedId(item.id)}
                bindEl={bindTileEl}
                onOpen={() =>
                  onOpenVideo({
                    id: item.id,
                    item,
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
  active,
  muted,
  onToggleMuted,
  onActivate,
  bindEl,
  onOpen,
}: {
  item: GalleryMainItem;
  thumbAspect?: number;
  active: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  onActivate: () => void;
  bindEl: (id: string, el: HTMLElement | null) => void;
  onOpen: () => void;
}) {
  return (
    <div className="j-main-gallery-item j-main-gallery-item--caption-below">
      <WorldJourneyVideoListingPlayer
        item={item}
        thumbAspect={thumbAspect}
        active={active}
        muted={muted}
        onToggleMuted={onToggleMuted}
        onOpenViewer={onOpen}
        onActivate={onActivate}
        rootRef={(el) => bindEl(item.id, el)}
      />
      <span className="j-main-gallery-info-panel">
        <button
          type="button"
          className="j-main-gallery-info-title"
          onClick={onOpen}
        >
          {item.label}
        </button>
        <GalleryAuthorRow
          authorName={item.authorName}
          authorAvatarUrl={item.authorAvatarUrl}
          authorSlug={item.authorSlug}
        />
      </span>
    </div>
  );
}
