"use client";

import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useMemo,
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
import { scheduleWhenIdle } from "@/lib/client/schedule-when-idle";

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
 * Muốn xem đầy đủ thì vào Journey. Eager: hiện khung ngay, query ngầm; ẩn nếu không có pin.
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
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
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

  useEffect(() => {
    setOpen(false);
    setItems(null);
    setLoadState(eager ? "loading" : "idle");
    setAspectById(new Map());
    onAvailabilityChange?.({ ready: false, count: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset theo slug
  }, [trimmed, eager]);

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;

    const runFetch = () => {
      if (cancelled) return;
      setLoadState("loading");
      void fetch(`/api/journey/${encodeURIComponent(trimmed)}/gallery-aside`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json: AsidePayload | null) => {
          if (cancelled) return;
          if (!json) {
            setLoadState("error");
            setItems([]);
            onAvailabilityChange?.({ ready: true, count: 0 });
            return;
          }
          const pinned = Array.isArray(json.pinned) ? json.pinned : [];
          setItems(pinned);
          setLoadState("ready");
          onAvailabilityChange?.({ ready: true, count: pinned.length });
        })
        .catch(() => {
          if (!cancelled) {
            setLoadState("error");
            setItems([]);
            onAvailabilityChange?.({ ready: true, count: 0 });
          }
        });
    };

    if (eager) {
      runFetch();
      return () => {
        cancelled = true;
      };
    }

    const cancelIdle = scheduleWhenIdle(runFetch, 1200);
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [trimmed, eager, onAvailabilityChange]);

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
  const emptyOrFailed =
    loadState === "error" ||
    (loadState === "ready" && (items?.length ?? 0) === 0);

  if (!trimmed) return null;
  /* Friend card list: chỉ hiện khi đã có pin (tránh flash khung trống). */
  if (!eager && !hasFeatured) return null;
  /* Popover eager: luôn giữ mũi tên xổ; rỗng thì hiện thông báo khi mở.
     (Ẩn hẳn chỉ khi hideToggle + đóng — không dùng toggle.) */
  if (hideToggle && eager && emptyOrFailed && !open) return null;

  const panelId = `j-user-featured-panel-${trimmed}`;

  const panelBody = (() => {
    if (!open) return null;
    if (pending) {
      return (
        <div
          id={panelId}
          className="j-user-featured-panel"
          role="region"
          aria-label="Nội dung nổi bật"
          aria-busy
        >
          <p className="j-user-featured-status">Đang tải nội dung nổi bật…</p>
        </div>
      );
    }
    if (!hasFeatured) {
      return (
        <div
          id={panelId}
          className="j-user-featured-panel"
          role="region"
          aria-label="Nội dung nổi bật"
        >
          <p className="j-user-featured-status">
            Chưa có nội dung nổi bật để xem trước.
          </p>
        </div>
      );
    }
    return (
      <div
        id={panelId}
        className="j-user-featured-panel"
        role="region"
        aria-label="Nội dung nổi bật"
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
        aria-label={open ? "Thu gọn nội dung nổi bật" : "Xem nội dung nổi bật"}
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
