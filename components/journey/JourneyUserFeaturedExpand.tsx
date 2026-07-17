"use client";

import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  GalleryEmbedPlatformBadge,
  GalleryItemVisual,
  GalleryVideoPlayBadge,
} from "@/components/journey/GalleryItemVisual";
import { GalleryAuthorCornerBadge } from "@/components/journey/GalleryAuthorCornerBadge";
import type { GalleryPinnedBanner } from "@/components/journey/JourneyGalleryAside";
import {
  getCachedVideoAspect,
  subscribeVideoAspectCache,
} from "@/lib/journey/gallery-video-dimension-cache";
import { packMasonryByAspect } from "@/lib/journey/masonry-pack";
import { probeImageDimensions } from "@/lib/journey/probe-image-dimensions";
import { probeRemoteVideoDimensions } from "@/lib/journey/probe-remote-video-dimensions";

import "./journey-user-featured.css";

type Props = {
  slug: string;
  /** Popover / chỗ user đang nhìn — hiện khung ngay + fetch ngầm. */
  eager?: boolean;
  /** Controlled — gắn với ô thống kê «Nổi bật». */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Ẩn nút «Nội dung nổi bật» — popover dùng ô thống kê «Nổi bật» để mở. */
  hideToggle?: boolean;
  /** Báo khi đã biết có / không có bài pin (để bật ô «Nổi bật»). */
  onAvailabilityChange?: (info: {
    ready: boolean;
    count: number;
  }) => void;
};

type AsidePayload = {
  pinned?: GalleryPinnedBanner[];
  /** Tổng Feature thật — không bị cắt bởi limit cột aside (24). */
  featuredCount?: number;
};

const FALLBACK_ASPECT = 16 / 9;
const MASONRY_COLS = 3;

/** Preset CF gallery-pinned / gallery-grid — không phải tỉ lệ gốc. */
function isGenericPreset(width: number, height: number): boolean {
  return (
    (width === 560 && height === 315) ||
    (width === 640 && height === 360) ||
    (width === 800 && height === 450)
  );
}

function seedAspect(item: GalleryPinnedBanner): number {
  const isVideo = item.isVideo || item.mediaKind === "video";
  if (isVideo) {
    const mp4 = item.videoPreviewSrc?.trim();
    if (mp4) {
      const cached = getCachedVideoAspect(mp4);
      if (cached) return cached;
    }
  }
  const w = item.width ?? 0;
  const h = item.height ?? 0;
  if (w > 0 && h > 0 && !isGenericPreset(w, h)) return w / h;
  return FALLBACK_ASPECT;
}

async function probeAspect(item: GalleryPinnedBanner): Promise<number> {
  const isVideo = item.isVideo || item.mediaKind === "video";
  if (isVideo) {
    const mp4 = item.videoPreviewSrc?.trim();
    if (mp4) {
      const cached = getCachedVideoAspect(mp4);
      if (cached) return cached;
      const dim = await probeRemoteVideoDimensions(mp4);
      if (dim && dim.width > 0 && dim.height > 0) {
        return dim.width / dim.height;
      }
    }
  }

  const src = item.src?.trim();
  if (src) {
    const dim = await probeImageDimensions(src);
    if (dim && dim.width > 0 && dim.height > 0) {
      return dim.width / dim.height;
    }
  }

  return seedAspect(item);
}

/**
 * Mũi tên dưới card user — xổ preview thumb Nội dung nổi bật (chỉ xem, không mở bài).
 * Eager: fetch ngay. Không eager: chỉ fetch khi `open` (không idle-prefetch).
 */
export function JourneyUserFeaturedExpand({
  slug,
  eager = false,
  open: openControlled,
  onOpenChange,
  hideToggle = false,
  onAvailabilityChange,
}: Props) {
  const trimmed = slug.trim();
  const [openUncontrolled, setOpenUncontrolled] = useState(true);
  const controlled = openControlled !== undefined;
  const open = controlled ? openControlled : openUncontrolled;
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    if (!controlled) setOpenUncontrolled(value);
    onOpenChange?.(value);
  };
  const [items, setItems] = useState<GalleryPinnedBanner[] | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    () => (eager ? "loading" : "idle"),
  );
  const [aspectById, setAspectById] = useState<Map<string, number>>(
    () => new Map(),
  );
  /** Tránh refetch khi đóng/mở lại cùng slug. */
  const fetchedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    /* Controlled: parent giữ open (modal actors mặc định thu gọn). */
    if (!controlled) setOpenUncontrolled(true);
    setItems(null);
    setLoadState(eager ? "loading" : "idle");
    setAspectById(new Map());
    fetchedSlugRef.current = null;
    onAvailabilityChange?.({ ready: false, count: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset theo slug
  }, [trimmed, eager]);

  useEffect(() => {
    if (!trimmed) return;
    /* Không eager → chỉ tải khi user mở panel (giảm bandwidth danh sách dài). */
    if (!eager && !open) return;
    if (fetchedSlugRef.current === trimmed) return;

    let cancelled = false;
    let completed = false;
    fetchedSlugRef.current = trimmed;
    setLoadState("loading");
    void fetch(`/api/journey/${encodeURIComponent(trimmed)}/gallery-aside`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: AsidePayload | null) => {
        if (cancelled) return;
        completed = true;
        if (!json) {
          fetchedSlugRef.current = null;
          setLoadState("error");
          setItems([]);
          onAvailabilityChange?.({ ready: true, count: 0 });
          return;
        }
        const pinned = Array.isArray(json.pinned) ? json.pinned : [];
        setItems(pinned);
        setLoadState("ready");
        const count =
          typeof json.featuredCount === "number"
            ? json.featuredCount
            : pinned.length;
        onAvailabilityChange?.({ ready: true, count });
      })
      .catch(() => {
        if (!cancelled) {
          completed = true;
          fetchedSlugRef.current = null;
          setLoadState("error");
          setItems([]);
          onAvailabilityChange?.({ ready: true, count: 0 });
        }
      });

    return () => {
      cancelled = true;
      if (!completed && fetchedSlugRef.current === trimmed) {
        fetchedSlugRef.current = null;
      }
    };
  }, [trimmed, eager, open, onAvailabilityChange]);

  useEffect(() => {
    if (!open || !items || items.length === 0) return;

    const seeded = new Map(items.map((item) => [item.id, seedAspect(item)]));
    setAspectById(seeded);

    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          aspect: await probeAspect(item),
        })),
      );
      if (cancelled) return;
      setAspectById(new Map(results.map((r) => [r.id, r.aspect])));
    })();

    const unsubCache = subscribeVideoAspectCache(() => {
      if (cancelled) return;
      setAspectById((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const item of items) {
          if (!(item.isVideo || item.mediaKind === "video")) continue;
          const mp4 = item.videoPreviewSrc?.trim();
          if (!mp4) continue;
          const cached = getCachedVideoAspect(mp4);
          if (!cached || next.get(item.id) === cached) continue;
          next.set(item.id, cached);
          changed = true;
        }
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
      unsubCache();
    };
  }, [open, items]);

  const columns = useMemo(() => {
    if (!items || items.length === 0) return null;
    const cells = items.map((item) => ({
      id: item.id,
      aspect: aspectById.get(item.id) ?? seedAspect(item),
      data: item,
    }));
    const packed = packMasonryByAspect(cells, MASONRY_COLS);
    const cols = [...packed];
    while (cols.length < MASONRY_COLS) cols.push([]);
    return cols.slice(0, MASONRY_COLS);
  }, [items, aspectById]);

  const pending = loadState === "idle" || loadState === "loading";
  const hasFeatured = loadState === "ready" && (items?.length ?? 0) > 0;

  if (!trimmed) return null;
  /* hideToggle (modal actors): chỉ mount panel khi mở — loading vẫn hiện. */
  if (hideToggle && !open) return null;
  /* Friend card / toggle: ẩn đến khi biết có pin; đang mở + đang tải thì hiện loading. */
  if (!eager && !hideToggle && !hasFeatured && !(open && pending)) return null;

  const panelId = `j-user-featured-panel-${trimmed}`;

  const panelBody = (() => {
    if (!open) return null;
    if (pending) {
      return (
        <div
          id={panelId}
          className="j-user-featured-panel"
          role="region"
          aria-label="Feature"
          aria-busy
        >
          <p className="j-user-featured-status">Đang tải Feature…</p>
        </div>
      );
    }
    if (!hasFeatured) {
      return (
        <div
          id={panelId}
          className="j-user-featured-panel"
          role="region"
          aria-label="Feature"
        >
          <p className="j-user-featured-status">Chưa có Feature để xem trước.</p>
        </div>
      );
    }
    return (
      <div
        id={panelId}
        className="j-user-featured-panel"
        role="region"
        aria-label="Feature"
      >
        <div
          className="j-user-featured-masonry"
          style={{ "--j-featured-cols": MASONRY_COLS } as CSSProperties}
        >
          {(columns ?? [[]]).map((col, colIndex) => (
            <div
              key={`col-${colIndex}`}
              className="j-user-featured-mcol"
              aria-hidden={col.length === 0 ? true : undefined}
            >
              {col.map((cell) => {
                const item = cell.data;
                const label =
                  [item.title, item.meta].filter(Boolean).join(" · ") ||
                  "Bài nổi bật";
                return (
                  <div
                    key={item.id}
                    className="j-user-featured-tile"
                    aria-label={label}
                    style={{ aspectRatio: String(cell.aspect) }}
                  >
                    <GalleryItemVisual
                      src={item.src}
                      srcSet={item.srcSet}
                      sizes={item.srcSet ? "140px" : undefined}
                      width={item.width}
                      height={item.height}
                      alt=""
                      isVideo={item.isVideo || item.mediaKind === "video"}
                      videoProcessing={item.videoProcessing}
                      videoPreviewSrc={item.videoPreviewSrc}
                    />
                    {item.isVideo || item.mediaKind === "video" ? (
                      <GalleryVideoPlayBadge />
                    ) : null}
                    {item.mediaKind === "embed" && item.embedProvider ? (
                      <GalleryEmbedPlatformBadge
                        provider={item.embedProvider}
                      />
                    ) : null}
                    {item.showSourceAuthor ? (
                      <GalleryAuthorCornerBadge
                        className="j-g-source-author--featured"
                        people={item.sourcePeople}
                        name={item.authorName}
                        avatarUrl={item.authorAvatarUrl}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  })();

  /* Popover: không nút «Nội dung nổi bật» — panel chỉ hiện khi mở qua ô «Nổi bật». */
  if (hideToggle) {
    if (!open) return null;
    return (
      <div className={`j-user-featured is-open${pending ? " is-pending" : ""}`}>
        {panelBody}
      </div>
    );
  }

  return (
    <div
      className={`j-user-featured${open ? " is-open" : ""}${pending ? " is-pending" : ""}`}
    >
      <button
        type="button"
        className="j-user-featured-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Thu gọn Feature" : "Xem Feature"}
        aria-busy={pending || undefined}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>

      {panelBody}
    </div>
  );
}
