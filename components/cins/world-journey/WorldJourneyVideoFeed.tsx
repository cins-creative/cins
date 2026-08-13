"use client";

import {
  ArrowLeft,
  Clapperboard,
  Play,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { JourneyCommentLink } from "@/components/journey/JourneyCommentLink";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { PostShareMenu } from "@/components/journey/PostActionsRail";
import { WORLD_JOURNEY_VIDEO_PAGE_SIZE } from "@/lib/cins/worldJourneyFeedConstants";
import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import {
  bindStreamPlayer,
  type StreamPlayer,
} from "@/lib/cloudflare/stream-player-sdk";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { isLikelyPortraitGalleryVideo } from "@/lib/journey/gallery-video-orientation";
import {
  canvasAspectFromRatio,
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";
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
  /** Video đang chọn trên listing — cuộn tới slide này lúc mở Reels. */
  startItemId?: string | null;
  onClose?: () => void;
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

function formatReelTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Src ổn định — play/pause/seek qua Stream SDK; chrome native tắt để không đè meta. */
function streamIframeSrc(uid: string): string {
  return `${buildStreamIframeUrl(uid)}?autoplay=false&muted=true&controls=false&preload=auto`;
}

function postStreamEvent(
  iframe: HTMLIFrameElement | null,
  event: "play" | "pause",
) {
  try {
    iframe?.contentWindow?.postMessage(JSON.stringify({ event }), "*");
  } catch {
    /* ignore */
  }
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
  const [aspectMode, setAspectMode] = useState<ReelAspectMode>(
    seededAspect.mode,
  );
  const [aspectRatio, setAspectRatio] = useState(seededAspect.ratio);
  const [paused, setPaused] = useState(!active);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<StreamPlayer | null>(null);
  /** User chủ động pause — đừng auto-play lại khi effect active chạy. */
  const userPausedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const target = reactionTarget(item);
  const authorHref = item.authorSlug ? `/${item.authorSlug}` : item.href;
  const caption = item.meta?.trim() || item.label?.trim() || "";
  const iframeSrc = active || preload ? streamIframeSrc(uid) : null;
  const progress =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const sharePath = item.href?.trim() || null;
  const shareTitle = item.label?.trim() || caption || "CINs";

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

  /* Bind Stream SDK → play/pause/seek + timeupdate. */
  useEffect(() => {
    const el = iframeRef.current;
    if (!el || !iframeSrc) {
      playerRef.current = null;
      return;
    }

    let cancelled = false;
    let player: StreamPlayer | null = null;

    const onPlay = () => {
      if (cancelled) return;
      setPaused(false);
    };
    const onPause = () => {
      if (cancelled) return;
      setPaused(true);
    };
    const onTime = () => {
      if (cancelled || !player || scrubbingRef.current) return;
      setCurrentTime(player.currentTime || 0);
      /* Sync badge với player thật — tránh play qua postMessage mà UI vẫn paused. */
      if (!player.paused) setPaused(false);
      const d = player.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onMeta = () => {
      if (cancelled || !player) return;
      const d = player.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
      setPaused(player.paused);
      setCurrentTime(player.currentTime || 0);
    };

    const detach = () => {
      if (!player) return;
      player.removeEventListener("play", onPlay);
      player.removeEventListener("playing", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("timeupdate", onTime);
      player.removeEventListener("durationchange", onMeta);
      player.removeEventListener("loadedmetadata", onMeta);
    };

    const playIfActive = (next: StreamPlayer) => {
      if (!activeRef.current || userPausedRef.current) {
        onMeta();
        return;
      }
      /* Không gọi onMeta() ngay — player.paused còn true trước khi play() resolve. */
      setPaused(false);
      const d = next.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
      setCurrentTime(next.currentTime || 0);
      void next.play().catch(() => {
        next.muted = true;
        void next.play().catch(() => {
          postStreamEvent(el, "play");
        });
      });
    };

    const attach = async () => {
      try {
        const next = await bindStreamPlayer(el);
        if (cancelled) return;
        detach();
        player = next;
        playerRef.current = next;
        next.addEventListener("play", onPlay);
        next.addEventListener("playing", onPlay);
        next.addEventListener("pause", onPause);
        next.addEventListener("timeupdate", onTime);
        next.addEventListener("durationchange", onMeta);
        next.addEventListener("loadedmetadata", onMeta);
        playIfActive(next);
      } catch {
        if (!cancelled) playerRef.current = null;
      }
    };

    const onLoad = () => {
      void attach();
    };
    void attach();
    el.addEventListener("load", onLoad);

    return () => {
      cancelled = true;
      el.removeEventListener("load", onLoad);
      detach();
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [iframeSrc, uid]);

  /* Slide active → play (trừ khi user đã pause); inactive → pause. */
  useEffect(() => {
    const el = iframeRef.current;

    const playActive = () => {
      if (userPausedRef.current) return;
      /* Ẩn nút play ngay khi bắt đầu autoplay — đừng chờ event SDK. */
      setPaused(false);
      const player = playerRef.current;
      if (player) {
        void player.play().catch(() => {
          player.muted = true;
          void player.play().catch(() => {
            postStreamEvent(el, "play");
          });
        });
        return;
      }
      postStreamEvent(el, "play");
    };
    const pauseInactive = () => {
      userPausedRef.current = false;
      setPaused(true);
      const player = playerRef.current;
      if (player) {
        player.pause();
        return;
      }
      postStreamEvent(el, "pause");
    };

    if (!active) {
      pauseInactive();
      return;
    }

    playActive();
    const t1 = window.setTimeout(playActive, 350);
    const t2 = window.setTimeout(playActive, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active, iframeSrc]);

  const togglePlayback = useCallback(() => {
    if (!active) return;
    const el = iframeRef.current;
    const player = playerRef.current;
    const isPaused = player ? player.paused : paused;
    if (isPaused) {
      userPausedRef.current = false;
      setPaused(false);
      if (player) {
        void player.play().catch(() => {
          player.muted = true;
          void player.play();
        });
      } else {
        postStreamEvent(el, "play");
      }
      return;
    }
    userPausedRef.current = true;
    setPaused(true);
    if (player) player.pause();
    else postStreamEvent(el, "pause");
  }, [active, paused]);

  const seekToRatio = useCallback((ratio: number) => {
    const player = playerRef.current;
    const d = player?.duration || duration;
    if (!player || !Number.isFinite(d) || d <= 0) return;
    const next = Math.min(d, Math.max(0, ratio * d));
    player.currentTime = next;
    setCurrentTime(next);
  }, [duration]);

  const onTimelinePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const track = e.currentTarget;
      track.setPointerCapture(e.pointerId);
      scrubbingRef.current = true;
      setScrubbing(true);
      const rect = track.getBoundingClientRect();
      const ratio =
        rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
      seekToRatio(ratio);
    },
    [seekToRatio],
  );

  const onTimelinePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio =
        rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
      seekToRatio(ratio);
    },
    [seekToRatio],
  );

  const onTimelinePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      scrubbingRef.current = false;
      setScrubbing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [],
  );

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

        {iframeSrc && !item.videoProcessing ? (
          <button
            type="button"
            className="wj-reel-tap"
            aria-label={paused ? "Phát video" : "Tạm dừng"}
            onClick={(e) => {
              e.stopPropagation();
              togglePlayback();
            }}
          />
        ) : null}

        {active && paused ? (
          <div className="wj-reel-pause-badge" aria-hidden>
            <Play size={28} strokeWidth={2.2} fill="currentColor" />
          </div>
        ) : null}

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

        {iframeSrc && !item.videoProcessing ? (
          <div
            className={
              "wj-reel-timeline" + (scrubbing ? " is-scrubbing" : "")
            }
            role="slider"
            aria-label="Timeline video"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration) || 0}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${formatReelTime(currentTime)} / ${formatReelTime(duration)}`}
            tabIndex={active ? 0 : -1}
            onPointerDown={onTimelinePointerDown}
            onPointerMove={onTimelinePointerMove}
            onPointerUp={onTimelinePointerUp}
            onPointerCancel={onTimelinePointerUp}
            onKeyDown={(e) => {
              if (!duration) return;
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                seekToRatio((currentTime + 2) / duration);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                seekToRatio((currentTime - 2) / duration);
              } else if (e.key === "Home") {
                e.preventDefault();
                seekToRatio(0);
              } else if (e.key === "End") {
                e.preventDefault();
                seekToRatio(1);
              } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                togglePlayback();
              }
            }}
          >
            <div className="wj-reel-timeline-track">
              <div
                className="wj-reel-timeline-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            {scrubbing || paused ? (
              <span className="wj-reel-timeline-time">
                {formatReelTime(currentTime)}
                {duration > 0 ? ` / ${formatReelTime(duration)}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}
      </article>

      {/* Cùng bộ nút timeline: Thích · BL · Lưu · Share (không dislike ở chế độ video) */}
      <div
        className="wj-reel-rail jcard-actions"
        aria-label="Tương tác"
        onClick={(e) => e.stopPropagation()}
      >
        {target ? (
          <>
            <JourneyLikeButton
              milestoneId={target.id}
              loaiDoiTuong={target.loai}
              showCount
              disableActorsReveal
            />
            <JourneyCommentLink
              commentCount={null}
              idDoiTuong={target.id}
              loaiDoiTuong={target.loai}
              href={sharePath ?? undefined}
              sharePath={sharePath}
              shareTitle={shareTitle}
              disableActorsReveal
            />
            <JourneyBookmarkButton
              milestoneId={target.id}
              title={shareTitle}
              loaiDoiTuong={target.loai}
              showCount
              disableActorsReveal
            />
          </>
        ) : null}
        {sharePath ? (
          <PostShareMenu
            sharePath={sharePath}
            shareTitle={shareTitle}
            className="jcard-share wj-reel-share"
            buttonClassName="share-btn"
          />
        ) : null}
      </div>
    </div>
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

function pickStartId(
  items: readonly GalleryMainItem[],
  startItemId?: string | null,
): string | null {
  if (startItemId && items.some((item) => item.id === startItemId)) {
    return startItemId;
  }
  return items[0]?.id ?? null;
}

/**
 * Surface Video (Reels) — chỉ Cloudflare Stream upload, UI kiểu Facebook.
 */
export function WorldJourneyVideoFeed({
  initialItems = [],
  hasMore: initialHasMore = false,
  nextOffset: initialOffset = 0,
  endpoint,
  startItemId = null,
  onClose,
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
  const [activeId, setActiveId] = useState<string | null>(() =>
    pickStartId(initialItems.filter(isStreamVideoItem), startItemId),
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const didScrollStartRef = useRef(false);

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
    setActiveId(pickStartId(seeded, startItemId));

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
        setActiveId(pickStartId(page.items, startItemId));
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
  }, [initialItems, initialHasMore, initialOffset, endpoint, startItemId]);

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

  useEffect(() => {
    didScrollStartRef.current = false;
  }, [startItemId]);

  useEffect(() => {
    if (didScrollStartRef.current || !startItemId) return;
    const root = scrollerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      `[data-reel-id="${CSS.escape(startItemId)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    didScrollStartRef.current = true;
  }, [items.length, startItemId]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (items.length === 0) {
    const empty = (
      bootstrapping || loading ? (
        <div className="wj-feed-empty" role="status" aria-busy="true">
          <Clapperboard size={22} strokeWidth={1.8} aria-hidden />
          <b>Đang tải video…</b>
        </div>
      ) : (
        <div className="wj-feed-empty">
          <Clapperboard size={22} strokeWidth={1.8} aria-hidden />
          <b>Chưa có video</b>
        </div>
      )
    );
    if (!onClose) return empty;
    return (
      <div className="wj-video-feed-wrap">
        <button
          type="button"
          className="wj-reel-back"
          aria-label="Quay lại danh sách video"
          onClick={onClose}
        >
          <ArrowLeft size={22} strokeWidth={2.2} aria-hidden />
        </button>
        {empty}
      </div>
    );
  }

  return (
    <div className="wj-video-feed-wrap">
      {onClose ? (
        <button
          type="button"
          className="wj-reel-back"
          aria-label="Quay lại danh sách video"
          onClick={onClose}
        >
          <ArrowLeft size={22} strokeWidth={2.2} aria-hidden />
        </button>
      ) : null}
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
    </div>
  );
}
