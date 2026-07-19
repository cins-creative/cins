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
import type { OrgShowcaseAsideKind } from "@/lib/org/org-showcase-aside-types";
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
  orgKind: OrgShowcaseAsideKind;
  /** Popover — hiện khung ngay + fetch ngầm. */
  eager?: boolean;
};

type AsidePayload = {
  pinned?: GalleryPinnedBanner[];
};

const FALLBACK_ASPECT = 16 / 9;
const MASONRY_COLS = 3;

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

function showcaseLabel(kind: OrgShowcaseAsideKind): string {
  if (kind === "studio") return "Showcase";
  if (kind === "co_so_dao_tao") return "Sản phẩm học viên";
  return "Feature";
}

/**
 * Mũi tên dưới card org — xổ preview:
 * studio = Showcase · cơ sở = sản phẩm học viên (sort điểm) · trường = bài media.
 * Chỉ xem trước; muốn xem đầy đủ thì vào trang org.
 */
export function JourneyOrgShowcaseExpand({
  slug,
  orgKind,
  eager = false,
}: Props) {
  const trimmed = slug.trim();
  /** Popover (`eager`): xổ panel ngay khi mở card; lazy friend-style vẫn đóng. */
  const [open, setOpen] = useState(eager);
  const [items, setItems] = useState<GalleryPinnedBanner[] | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    () => (eager ? "loading" : "idle"),
  );
  const [aspectById, setAspectById] = useState<Map<string, number>>(
    () => new Map(),
  );

  const label = showcaseLabel(orgKind);

  useEffect(() => {
    setOpen(eager);
    setItems(null);
    setLoadState(eager ? "loading" : "idle");
    setAspectById(new Map());
  }, [trimmed, orgKind, eager]);

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;

    const runFetch = () => {
      if (cancelled) return;
      setLoadState("loading");
      const qs = new URLSearchParams({ slug: trimmed, kind: orgKind });
      void fetch(`/api/org/showcase-aside?${qs.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json: AsidePayload | null) => {
          if (cancelled) return;
          if (!json) {
            setLoadState("error");
            setItems([]);
            return;
          }
          const pinned = Array.isArray(json.pinned) ? json.pinned : [];
          setItems(pinned);
          setLoadState("ready");
        })
        .catch(() => {
          if (!cancelled) {
            setLoadState("error");
            setItems([]);
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
  }, [trimmed, orgKind, eager]);

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
  /* Eager popover: giữ mũi tên; lazy (friend-style): chỉ hiện khi đã có pin. */
  if (!eager && !hasFeatured) return null;

  const panelId = `j-org-showcase-panel-${orgKind}-${trimmed}`;

  const panelBody = (() => {
    if (!open) return null;
    if (pending) {
      return (
        <div
          id={panelId}
          className="j-user-featured-panel"
          role="region"
          aria-label={label}
          aria-busy
        >
          <p className="j-user-featured-status">Đang tải {label.toLowerCase()}…</p>
        </div>
      );
    }
    if (!hasFeatured) {
      return (
        <div
          id={panelId}
          className="j-user-featured-panel"
          role="region"
          aria-label={label}
        >
          <p className="j-user-featured-status">
            Chưa có {label.toLowerCase()} để xem trước.
          </p>
        </div>
      );
    }
    return (
      <div
        id={panelId}
        className="j-user-featured-panel"
        role="region"
        aria-label={label}
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
                const tileLabel =
                  [item.title, item.meta].filter(Boolean).join(" · ") || label;
                return (
                  <div
                    key={item.id}
                    className="j-user-featured-tile"
                    aria-label={tileLabel}
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
    );
  })();

  return (
    <div
      className={`j-user-featured${open ? " is-open" : ""}${pending ? " is-pending" : ""}`}
    >
      <button
        type="button"
        className="j-user-featured-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? `Thu gọn ${label.toLowerCase()}` : `Xem ${label.toLowerCase()}`}
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
