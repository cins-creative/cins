"use client";

import {
  Bookmark,
  Clapperboard,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";
import { WORLD_JOURNEY_VIDEO_PAGE_SIZE } from "@/lib/cins/worldJourneyFeedConstants";
import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { isLikelyPortraitGalleryVideo } from "@/lib/journey/gallery-video-orientation";
import {
  canvasAspectFromRatio,
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";
import { REACTION_EMOJI } from "@/lib/social/reaction-emoji";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";

type ReelAspectMode = "portrait" | "landscape";

function reelAspectFromItem(item: GalleryMainItem): {
  mode: ReelAspectMode;
  ratio: number;
  canvasRatio: VideoCanvasRatio | null;
} {
  const canvasRatio = item.videoCanvasRatio ?? null;
  if (canvasRatio === "9:16" || canvasRatio === "3:4") {
    return {
      mode: "portrait",
      ratio: canvasAspectFromRatio(canvasRatio),
      canvasRatio,
    };
  }
  if (canvasRatio === "16:9" || canvasRatio === "1:1") {
    return {
      mode: "landscape",
      ratio: canvasAspectFromRatio(canvasRatio),
      canvasRatio,
    };
  }
  if (isLikelyPortraitGalleryVideo(item)) {
    return { mode: "portrait", ratio: 9 / 16, canvasRatio };
  }
  const w = item.width ?? 0;
  const h = item.height ?? 0;
  if (w > 0 && h > 0) {
    return {
      mode: w < h ? "portrait" : "landscape",
      ratio: w / h,
      canvasRatio,
    };
  }
  /* Mặc định ngang — clip VFX/demo thường 16:9; tránh ép 9:16. */
  return { mode: "landscape", ratio: 16 / 9, canvasRatio };
}

type Props = {
  initialItems?: ReadonlyArray<GalleryMainItem>;
  hasMore?: boolean;
  nextOffset?: number;
  endpoint: string;
};

/** Số video kế tiếp mount iframe (muted, không autoplay) trước khi scroll tới. */
const REEL_IFRAME_PRELOAD = 2;
/** Còn ≤ N video trong list → prefetch trang API kế (không đợi sentinel). */
const REEL_PAGE_PREFETCH_REMAINING = 3;

function isStreamVideoItem(item: GalleryMainItem): boolean {
  return Boolean(item.streamUid?.trim());
}

function reactionTarget(item: GalleryMainItem): {
  loai: string;
  id: string;
} | null {
  const id = item.cotMocId?.trim();
  if (!id) return null;
  if (item.id.startsWith("org-post-") || item.id.startsWith("showcase-")) {
    return { loai: SOCIAL_LOAI_ORG_BAI_DANG, id };
  }
  return { loai: SOCIAL_LOAI_DOI_TUONG.COT_MOC, id };
}

function formatCount(n: number): string {
  if (n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Src ổn định — play/pause bằng postMessage để không reload khi active. */
function streamIframeSrc(uid: string): string {
  return `${buildStreamIframeUrl(uid)}?autoplay=false&muted=true&controls=true&preload=auto`;
}

function ReelSlide({
  item,
  active,
  preload,
}: {
  item: GalleryMainItem;
  active: boolean;
  /** Mount iframe trước (không autoplay) để cuộn tới phát ngay. */
  preload: boolean;
}) {
  const uid = item.streamUid!.trim();
  const poster = item.src || item.videoPreviewSrc || undefined;
  const seededAspect = reelAspectFromItem(item);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [aspectMode, setAspectMode] = useState<ReelAspectMode>(
    seededAspect.mode,
  );
  const [aspectRatio, setAspectRatio] = useState(seededAspect.ratio);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const target = reactionTarget(item);
  const authorHref = item.authorSlug ? `/${item.authorSlug}` : item.href;
  const caption = item.meta?.trim() || item.label?.trim() || "";
  const iframeSrc = active || preload ? streamIframeSrc(uid) : null;

  useEffect(() => {
    const next = reelAspectFromItem(item);
    setAspectMode(next.mode);
    setAspectRatio(next.ratio);
  }, [item]);

  /* Thiếu videoCanvasRatio → đo poster thật (Stream thumb) để chọn fill-W / 9:16. */
  useEffect(() => {
    if (item.videoCanvasRatio || !poster) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      setAspectMode(ratio < 1 ? "portrait" : "landscape");
      setAspectRatio(ratio < 1 ? 9 / 16 : ratio >= 1.2 ? 16 / 9 : ratio);
    };
    img.src = poster;
    return () => {
      cancelled = true;
    };
  }, [item.videoCanvasRatio, poster]);

  const toggleLike = useCallback(async () => {
    if (!target || busy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loai_doi_tuong: target.loai,
          id_doi_tuong: target.id,
          emoji: REACTION_EMOJI.LIKE,
          active: next,
        }),
      });
      if (!res.ok) {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
        return;
      }
      const json = (await res.json()) as { likeCount?: number };
      if (typeof json.likeCount === "number") setLikeCount(json.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }, [busy, liked, target]);

  /* Giữ iframe đã preload — play/pause qua postMessage (Stream player). */
  useEffect(() => {
    const el = iframeRef.current;
    if (!el || !iframeSrc) return;
    const send = () => {
      try {
        el.contentWindow?.postMessage(
          JSON.stringify({ event: active ? "play" : "pause" }),
          "*",
        );
      } catch {
        /* ignore */
      }
    };
    send();
    el.addEventListener("load", send);
    const t1 = window.setTimeout(send, 350);
    const t2 = window.setTimeout(send, 1200);
    return () => {
      el.removeEventListener("load", send);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active, iframeSrc]);

  return (
    <div
      className="wj-reel-stage"
      data-aspect={aspectMode}
      style={
        {
          "--wj-reel-aspect": String(aspectRatio),
        } as CSSProperties
      }
    >
      <article className="wj-reel-slide" data-active={active || undefined}>
        <div className="wj-reel-media">
          {item.videoProcessing ? (
            <VideoProcessingPlaceholder />
          ) : iframeSrc ? (
            <iframe
              ref={iframeRef}
              key={uid}
              className="wj-reel-iframe"
              src={iframeSrc}
              title={item.label || "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              tabIndex={active ? 0 : -1}
              aria-hidden={active ? undefined : true}
            />
          ) : poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="wj-reel-poster" src={poster} alt="" />
          ) : (
            <div className="wj-reel-poster-fallback" aria-hidden>
              <Clapperboard size={40} strokeWidth={1.6} />
            </div>
          )}
        </div>

        <div className="wj-reel-meta">
          <div className="wj-reel-author">
            {authorHref ? (
              <Link
                href={authorHref}
                className="wj-reel-av"
                onClick={(e) => e.stopPropagation()}
              >
                {item.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.authorAvatarUrl} alt="" />
                ) : (
                  <span>
                    {(item.authorName ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </Link>
            ) : (
              <span className="wj-reel-av">
                {(item.authorName ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="wj-reel-author-text">
              {authorHref ? (
                <Link
                  href={authorHref}
                  className="wj-reel-name"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.authorName || "Người dùng"}
                </Link>
              ) : (
                <span className="wj-reel-name">
                  {item.authorName || "Người dùng"}
                </span>
              )}
              {item.orgKicker ? (
                <span className="wj-reel-kicker">{item.orgKicker}</span>
              ) : null}
            </div>
            {authorHref ? (
              <Link
                href={authorHref}
                className="wj-reel-follow"
                onClick={(e) => e.stopPropagation()}
              >
                Theo dõi
              </Link>
            ) : null}
          </div>
          {caption ? <p className="wj-reel-caption">{caption}</p> : null}
        </div>
      </article>

      <div className="wj-reel-rail" aria-label="Tương tác">
        <ReelAction
          label="Thích"
          count={likeCount}
          active={liked}
          onClick={() => void toggleLike()}
        >
          <ThumbsUp
            size={26}
            strokeWidth={liked ? 0 : 2}
            fill={liked ? "currentColor" : "none"}
          />
        </ReelAction>
        <ReelAction label="Bình luận" href={item.href}>
          <MessageCircle size={26} strokeWidth={2} />
        </ReelAction>
        <ReelAction
          label="Chia sẻ"
          onClick={() => {
            if (!item.href || typeof navigator === "undefined") return;
            const url = new URL(item.href, window.location.origin).toString();
            if (navigator.share) {
              void navigator.share({ url, title: item.label }).catch(() => {});
            } else if (navigator.clipboard) {
              void navigator.clipboard.writeText(url);
            }
          }}
        >
          <Share2 size={26} strokeWidth={2} />
        </ReelAction>
        <ReelAction label="Lưu">
          <Bookmark size={26} strokeWidth={2} />
        </ReelAction>
        <ReelAction label="Thêm" href={item.href}>
          <MoreHorizontal size={26} strokeWidth={2} />
        </ReelAction>
      </div>
    </div>
  );
}

function ReelAction({
  label,
  count,
  active,
  href,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const countText = typeof count === "number" ? formatCount(count) : "";
  const className = `wj-reel-action${active ? " is-on" : ""}`;
  const inner = (
    <>
      <span className="wj-reel-action-icon">{children}</span>
      {countText ? (
        <span className="wj-reel-action-count">{countText}</span>
      ) : null}
      <span className="sr-only">{label}</span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {inner}
    </button>
  );
}

async function fetchVideoPage(
  endpoint: string,
  offset: number,
): Promise<{
  items: GalleryMainItem[];
  hasMore: boolean;
  nextOffset: number;
} | null> {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(WORLD_JOURNEY_VIDEO_PAGE_SIZE));
  if (!url.searchParams.get("filter")) {
    url.searchParams.set("filter", "video");
  }
  url.searchParams.set("source", "all");
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: GalleryMainItem[];
    hasMore?: boolean;
    nextOffset?: number;
  };
  const items = (data.items ?? []).filter(isStreamVideoItem);
  return {
    items,
    hasMore: Boolean(data.hasMore),
    nextOffset:
      typeof data.nextOffset === "number"
        ? data.nextOffset
        : offset + items.length,
  };
}

/**
 * Surface Video (Reels) — chỉ Cloudflare Stream upload, UI kiểu Facebook.
 */
export function WorldJourneyVideoFeed({
  initialItems = [],
  hasMore: initialHasMore = false,
  nextOffset: initialOffset = 0,
  endpoint,
}: Props) {
  const [items, setItems] = useState<GalleryMainItem[]>(() =>
    initialItems.filter(isStreamVideoItem),
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(
    () => initialItems.filter(isStreamVideoItem).length === 0,
  );
  const [activeId, setActiveId] = useState<string | null>(
    () => initialItems.find(isStreamVideoItem)?.id ?? null,
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const activeIndex = useMemo(() => {
    if (!activeId) return 0;
    const idx = items.findIndex((item) => item.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [activeId, items]);

  useEffect(() => {
    const seeded = initialItems.filter(isStreamVideoItem);
    setItems(seeded);
    setHasMore(initialHasMore);
    setOffset(initialOffset);
    setActiveId(seeded[0]?.id ?? null);

    if (seeded.length > 0) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    loadingRef.current = true;
    setBootstrapping(true);
    setLoading(true);
    void (async () => {
      try {
        const page = await fetchVideoPage(endpoint, 0);
        if (cancelled || !page) return;
        setItems(page.items);
        setHasMore(page.hasMore);
        setOffset(page.nextOffset);
        setActiveId(page.items[0]?.id ?? null);
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
          setLoading(false);
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingRef.current = false;
    };
  }, [initialItems, initialHasMore, initialOffset, endpoint]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const page = await fetchVideoPage(endpoint, offset);
      if (!page) return;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setHasMore(page.hasMore);
      setOffset(page.nextOffset);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [endpoint, hasMore, offset]);

  /* Prefetch trang API sớm: giữ ≥2 trang trong buffer + khi gần hết list. */
  useEffect(() => {
    if (!hasMore || loadingRef.current || items.length === 0) return;
    const remaining = items.length - activeIndex - 1;
    const nearEnd = remaining <= REEL_PAGE_PREFETCH_REMAINING;
    const wantBuffer = items.length < WORLD_JOURNEY_VIDEO_PAGE_SIZE * 2;
    if (!nearEnd && !wantBuffer) return;
    void loadMore();
  }, [activeIndex, hasMore, items.length, loadMore]);

  /* Warm poster của các clip sắp tới. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const start = activeIndex + 1;
    const end = Math.min(items.length, start + REEL_IFRAME_PRELOAD + 1);
    for (let i = start; i < end; i++) {
      const src = items[i]?.src || items[i]?.videoPreviewSrc;
      if (!src) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }, [activeIndex, items]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>(".wj-reel-snap");
    if (slides.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.reelId;
          if (!id) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { id, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveId(best.id);
      },
      { root, threshold: [0.55, 0.75, 0.9] },
    );
    slides.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    const root = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { root, rootMargin: "600px 0px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    if (bootstrapping || loading) {
      return (
        <div className="wj-feed-empty" role="status" aria-busy="true">
          <Clapperboard size={22} strokeWidth={1.8} aria-hidden />
          <b>Đang tải video…</b>
        </div>
      );
    }
    return (
      <div className="wj-feed-empty">
        <Clapperboard size={22} strokeWidth={1.8} aria-hidden />
        <b>Chưa có video</b>
      </div>
    );
  }

  return (
    <div className="wj-video-feed" ref={scrollerRef} aria-label="Video">
      {items.map((item, index) => {
        const active = activeId === item.id;
        const preload =
          !active &&
          index > activeIndex &&
          index <= activeIndex + REEL_IFRAME_PRELOAD;
        return (
          <div key={item.id} className="wj-reel-snap" data-reel-id={item.id}>
            <ReelSlide item={item} active={active} preload={preload} />
          </div>
        );
      })}
      <div ref={sentinelRef} className="wj-reel-sentinel" aria-hidden />
      {loading ? (
        <div className="wj-reel-loading" role="status">
          Đang tải thêm…
        </div>
      ) : null}
    </div>
  );
}
