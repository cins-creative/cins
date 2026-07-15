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
 * Muốn xem đầy đủ thì vào Journey. Ẩn khi user không có bài pinned.
 */
export function JourneyUserFeaturedExpand({ slug }: Props) {
  const trimmed = slug.trim();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GalleryPinnedBanner[] | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [aspectById, setAspectById] = useState<Map<string, number>>(
    () => new Map(),
  );

  useEffect(() => {
    setOpen(false);
    setItems(null);
    setLoadState("idle");
    setAspectById(new Map());
  }, [trimmed]);

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    setLoadState("loading");
    void fetch(`/api/journey/${encodeURIComponent(trimmed)}/gallery-aside`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: AsidePayload | null) => {
        if (cancelled) return;
        if (!json) {
          setLoadState("error");
          setItems([]);
          return;
        }
        setItems(Array.isArray(json.pinned) ? json.pinned : []);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState("error");
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

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
    /* Giữ đúng 3 cột UI kể cả khi ít bài / cột pack trống bị lọc. */
    const cols = [...packed];
    while (cols.length < MASONRY_COLS) cols.push([]);
    return cols.slice(0, MASONRY_COLS);
  }, [items, aspectById]);

  const hasFeatured = loadState === "ready" && (items?.length ?? 0) > 0;

  if (!trimmed || !hasFeatured) return null;

  return (
    <div className={`j-user-featured${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="j-user-featured-toggle"
        aria-expanded={open}
        aria-controls={`j-user-featured-panel-${trimmed}`}
        aria-label={open ? "Thu gọn nội dung nổi bật" : "Xem nội dung nổi bật"}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>

      {open ? (
        <div
          id={`j-user-featured-panel-${trimmed}`}
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
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
