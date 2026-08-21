"use client";

import {
  Clapperboard,
  Maximize2,
  Minimize2,
  Pause,
  Play,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { JourneyCommentLink } from "@/components/journey/JourneyCommentLink";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { PostShareMenu } from "@/components/journey/PostActionsRail";
import {
  WORLD_JOURNEY_TAB_PAN_MS,
  WORLD_JOURNEY_VIDEO_LISTING_PAGE_SIZE,
  WORLD_JOURNEY_VIDEO_PAGE_SIZE,
} from "@/lib/cins/worldJourneyFeedConstants";
import { replaceVideoPlayUrl } from "@/lib/cins/worldJourneyVideoUrl";
import {
  buildStreamIframeUrl,
  buildStreamThumbnailAtTime,
} from "@/lib/cloudflare/stream-embed";
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

/** width/height gallery hay là stub từ bucket 16:9 / 9:16 — không phải pixel thật. */
function isPreviewStubSize(width: number, height: number): boolean {
  if (!(width > 0 && height > 0)) return true;
  return (
    (width === 405 && height === 720) ||
    (width === 720 && height === 960) ||
    (width === 1280 && height === 720) ||
    (width === 720 && height === 720) ||
    (width === 800 && height === 450)
  );
}

function reelAspectFromItem(item: GalleryMainItem): {
  mode: ReelAspectMode;
  ratio: number;
  canvasRatio: VideoCanvasRatio | null;
} {
  const canvasRatio = item.videoCanvasRatio ?? null;
  const w = item.width ?? 0;
  const h = item.height ?? 0;
  /* Ưu tiên tỉ lệ pixel thật — đừng ép bucket 9:16 (khung hẹp hơn nội dung). */
  if (w > 0 && h > 0 && !isPreviewStubSize(w, h)) {
    return {
      mode: w < h ? "portrait" : "landscape",
      ratio: w / h,
      canvasRatio,
    };
  }
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
  return { mode: "landscape", ratio: 16 / 9, canvasRatio };
}

function playerNaturalSize(player: StreamPlayer): {
  width: number;
  height: number;
} | null {
  const width = player.videoWidth ?? 0;
  const height = player.videoHeight ?? 0;
  if (width > 0 && height > 0) return { width, height };
  return null;
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

function isCoarsePointer(e: { pointerType?: string }): boolean {
  return e.pointerType === "touch" || e.pointerType === "pen";
}

async function toggleElementFullscreen(el: HTMLElement | null): Promise<void> {
  if (!el) return;
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  };
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const current = document.fullscreenElement ?? doc.webkitFullscreenElement;
  if (current) {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    await doc.webkitExitFullscreen?.();
    return;
  }
  if (el.requestFullscreen) {
    await el.requestFullscreen();
    return;
  }
  await anyEl.webkitRequestFullscreen?.();
}

function ReelSlide({
  item,
  active,
  preload,
  canPlay,
}: {
  item: GalleryMainItem;
  active: boolean;
  /** Mount iframe trước (không autoplay) để cuộn tới phát ngay. */
  preload: boolean;
  /** Chỉ play khi slide đã vào khung chính (sau scroll-into-view). */
  canPlay: boolean;
}) {
  const uid = item.streamUid!.trim();
  const poster = item.src || item.videoPreviewSrc || undefined;
  const seededAspect = reelAspectFromItem(item);
  const [aspectMode, setAspectMode] = useState<ReelAspectMode>(
    seededAspect.mode,
  );
  const [aspectRatio, setAspectRatio] = useState(seededAspect.ratio);
  const [paused, setPaused] = useState(!(active && canPlay));
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubRatio, setScrubRatio] = useState(0);
  const [chromeOn, setChromeOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const slideRef = useRef<HTMLElement>(null);
  const chromeHideRef = useRef(0);
  const tapOriginRef = useRef({ x: 0, y: 0 });
  const tapArmedRef = useRef(false);
  const ignoreTapUntilRef = useRef(0);
  const playerRef = useRef<StreamPlayer | null>(null);
  /** User chủ động pause — đừng auto-play lại khi effect active chạy. */
  const userPausedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const seekRafRef = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const canPlayRef = useRef(canPlay);
  canPlayRef.current = canPlay;
  const target = reactionTarget(item);
  const caption = item.meta?.trim() || item.label?.trim() || "";
  const iframeSrc = active || preload ? streamIframeSrc(uid) : null;
  const progress =
    duration > 0
      ? Math.min(
          100,
          Math.max(0, (scrubbing ? scrubRatio : currentTime / duration) * 100),
        )
      : 0;
  const previewThumb =
    scrubbing && duration > 0
      ? buildStreamThumbnailAtTime(uid, scrubRatio * duration)
      : null;
  const sharePath = item.href?.trim() || null;
  const shareTitle = item.label?.trim() || caption || "CINs";

  useEffect(() => {
    const next = reelAspectFromItem(item);
    setAspectMode(next.mode);
    setAspectRatio(next.ratio);
  }, [item]);

  useEffect(() => {
    return () => {
      if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
      window.clearTimeout(chromeHideRef.current);
    };
  }, []);

  useEffect(() => {
    const onFs = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      const current =
        document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsFullscreen(current === slideRef.current);
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  useEffect(() => {
    if (active && canPlay) {
      ignoreTapUntilRef.current = Date.now() + 500;
      tapArmedRef.current = false;
    }
  }, [active, canPlay]);

  const revealChrome = useCallback((sticky = false) => {
    setChromeOn(true);
    window.clearTimeout(chromeHideRef.current);
    if (sticky) return;
    chromeHideRef.current = window.setTimeout(() => {
      if (!scrubbingRef.current) setChromeOn(false);
    }, 3200);
  }, []);

  const applyNaturalAspect = useCallback((width: number, height: number) => {
    if (!(width > 0 && height > 0)) return;
    const ratio = width / height;
    if (!(ratio > 0) || !Number.isFinite(ratio)) return;
    setAspectMode(ratio < 1 ? "portrait" : "landscape");
    setAspectRatio((prev) => (Math.abs(prev - ratio) < 0.002 ? prev : ratio));
  }, []);

  /* Đo poster / Stream thumb — tỉ lệ thật, không snap 9:16 hay 16:9. */
  useEffect(() => {
    if (!poster) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      applyNaturalAspect(img.naturalWidth, img.naturalHeight);
    };
    img.src = poster;
    return () => {
      cancelled = true;
    };
  }, [applyNaturalAspect, poster]);

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
      const size = playerNaturalSize(player);
      if (size) applyNaturalAspect(size.width, size.height);
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
      if (!activeRef.current || !canPlayRef.current || userPausedRef.current) {
        next.pause();
        onMeta();
        return;
      }
      /* Không gọi onMeta() ngay — player.paused còn true trước khi play() resolve. */
      setPaused(false);
      const d = next.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
      setCurrentTime(next.currentTime || 0);
      next.muted = true;
      void next.play().catch(() => {
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

  /* Slide vào khung chính → play; preload / chưa snap xong → pause. */
  useEffect(() => {
    const el = iframeRef.current;

    const playActive = () => {
      if (userPausedRef.current || !canPlayRef.current) return;
      /* Ẩn nút play ngay khi bắt đầu autoplay — đừng chờ event SDK. */
      setPaused(false);
      const player = playerRef.current;
      if (player) {
        player.muted = true;
        void player.play().catch(() => {
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
    if (!canPlay) {
      setPaused(true);
      const player = playerRef.current;
      if (player) player.pause();
      else postStreamEvent(el, "pause");
      return;
    }

    playActive();
    const t1 = window.setTimeout(playActive, 350);
    const t2 = window.setTimeout(playActive, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active, canPlay, iframeSrc]);

  const toggleFullscreen = useCallback(() => {
    void toggleElementFullscreen(slideRef.current).catch(() => {});
  }, []);

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
    const clamped = Math.min(1, Math.max(0, ratio));
    const player = playerRef.current;
    const d = player?.duration || duration;
    setScrubRatio(clamped);
    if (!Number.isFinite(d) || d <= 0) return;
    const next = clamped * d;
    setCurrentTime(next);
    if (!player) return;
    if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
    seekRafRef.current = requestAnimationFrame(() => {
      seekRafRef.current = 0;
      player.currentTime = next;
    });
  }, [duration]);

  const ratioFromPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    },
    [],
  );

  const onTimelinePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const track = e.currentTarget;
      track.setPointerCapture(e.pointerId);
      const player = playerRef.current;
      wasPlayingRef.current = player ? !player.paused : !paused;
      if (player && !player.paused) player.pause();
      scrubbingRef.current = true;
      setScrubbing(true);
      revealChrome(true);
      seekToRatio(ratioFromPointer(e));
    },
    [paused, ratioFromPointer, revealChrome, seekToRatio],
  );

  const onTimelinePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      e.stopPropagation();
      seekToRatio(ratioFromPointer(e));
    },
    [ratioFromPointer, seekToRatio],
  );

  const onTimelinePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (scrubbingRef.current) {
        seekToRatio(ratioFromPointer(e));
      }
      scrubbingRef.current = false;
      setScrubbing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (wasPlayingRef.current && !userPausedRef.current) {
        const player = playerRef.current;
        if (player) {
          void player.play().catch(() => {
            player.muted = true;
            void player.play();
          });
        }
        revealChrome(false);
      } else {
        revealChrome(true);
      }
      wasPlayingRef.current = false;
    },
    [ratioFromPointer, revealChrome, seekToRatio],
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
      <div className="wj-reel-frame">
        <div className="wj-reel-main">
          <div className="wj-reel-video-row">
          <article
            ref={slideRef}
            className={
              "wj-reel-slide" +
              (chromeOn || scrubbing || paused ? " is-chrome" : "")
            }
            data-active={active || undefined}
            data-paused={paused || undefined}
          >
            <div className="wj-reel-video-box">
            <div className="wj-reel-media">
              {item.videoProcessing ? (
                <VideoProcessingPlaceholder />
              ) : (
                <>
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="wj-reel-poster" src={poster} alt="" />
                  ) : !iframeSrc ? (
                    <div className="wj-reel-poster-fallback" aria-hidden>
                      <Clapperboard size={40} strokeWidth={1.6} />
                    </div>
                  ) : null}
                  {iframeSrc ? (
                    <iframe
                      ref={iframeRef}
                      key={uid}
                      className="wj-reel-iframe"
                      src={iframeSrc}
                      title={item.label || "Video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                      tabIndex={-1}
                      aria-hidden={active ? undefined : true}
                    />
                  ) : null}
                </>
              )}
            </div>

            {iframeSrc && !item.videoProcessing ? (
              <button
                type="button"
                className="wj-reel-tap"
                aria-label="Điều khiển video"
                onPointerDown={(e) => {
                  tapArmedRef.current = true;
                  tapOriginRef.current = { x: e.clientX, y: e.clientY };
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  const armed = tapArmedRef.current;
                  tapArmedRef.current = false;
                  if (!armed) return;
                  if (Date.now() < ignoreTapUntilRef.current) return;
                  const dx = e.clientX - tapOriginRef.current.x;
                  const dy = e.clientY - tapOriginRef.current.y;
                  if (dx * dx + dy * dy > 64) return;
                  if (isCoarsePointer(e)) {
                    if (chromeOn && !paused) {
                      window.clearTimeout(chromeHideRef.current);
                      setChromeOn(false);
                    } else {
                      revealChrome(paused);
                    }
                    return;
                  }
                  togglePlayback();
                }}
              />
            ) : null}
            </div>
            {iframeSrc && !item.videoProcessing ? (
              <div
                className={
                  "wj-reel-timeline" + (scrubbing ? " is-scrubbing" : "")
                }
              >
                <button
                  type="button"
                  className="wj-reel-timeline-btn"
                  aria-label={paused ? "Phát video" : "Tạm dừng"}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayback();
                    revealChrome(!paused);
                  }}
                >
                  {paused ? (
                    <Play size={18} strokeWidth={2.2} fill="currentColor" />
                  ) : (
                    <Pause size={18} strokeWidth={2.2} fill="currentColor" />
                  )}
                </button>
                <div
                  className="wj-reel-timeline-scrub"
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
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      seekToRatio((currentTime + 2) / duration);
                    } else if (e.key === "ArrowLeft") {
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
                  {scrubbing && previewThumb ? (
                    <div
                      className="wj-reel-scrub-preview"
                      style={{
                        left: `${Math.min(86, Math.max(14, progress))}%`,
                      }}
                      aria-hidden
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewThumb} alt="" />
                      <span>{formatReelTime(currentTime)}</span>
                    </div>
                  ) : null}
                  <div className="wj-reel-timeline-track">
                    <div
                      className="wj-reel-timeline-fill"
                      style={{ width: `${progress}%` }}
                    />
                    <span
                      className="wj-reel-timeline-knob"
                      style={{ left: `${progress}%` }}
                    />
                  </div>
                </div>
                <span className="wj-reel-timeline-time">
                  {formatReelTime(currentTime)}
                  {duration > 0 ? ` / ${formatReelTime(duration)}` : ""}
                </span>
                <button
                  type="button"
                  className="wj-reel-timeline-btn"
                  aria-label={
                    isFullscreen ? "Thoát toàn màn hình" : "Phóng toàn màn hình"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                    revealChrome(false);
                  }}
                >
                  {isFullscreen ? (
                    <Minimize2 size={16} strokeWidth={2.2} />
                  ) : (
                    <Maximize2 size={16} strokeWidth={2.2} />
                  )}
                </button>
              </div>
            ) : null}
              <div className="wj-reel-meta">
                <div className="wj-reel-author">
                  {item.authorSlug ? (
                    <JourneyUserPopover
                      slug={item.authorSlug}
                      fallbackName={item.authorName}
                      fallbackAvatarUrl={item.authorAvatarUrl}
                      track={target ? { idBoiCanh: target.id } : null}
                    >
                      <span className="wj-reel-author-hit">
                        <span className="wj-reel-av">
                          {item.authorAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.authorAvatarUrl} alt="" />
                          ) : (
                            <span>
                              {(item.authorName ?? "?").slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="wj-reel-author-text">
                          <span className="wj-reel-name">
                            {item.authorName || "Người dùng"}
                          </span>
                          {item.orgKicker ? (
                            <span className="wj-reel-kicker">{item.orgKicker}</span>
                          ) : null}
                        </span>
                      </span>
                    </JourneyUserPopover>
                  ) : (
                    <>
                      <span className="wj-reel-av">
                        {(item.authorName ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="wj-reel-author-text">
                        <span className="wj-reel-name">
                          {item.authorName || "Người dùng"}
                        </span>
                        {item.orgKicker ? (
                          <span className="wj-reel-kicker">{item.orgKicker}</span>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
                {caption ? <p className="wj-reel-caption">{caption}</p> : null}
              </div>
          </article>

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
        </div>
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
  url.searchParams.set("limit", String(WORLD_JOURNEY_VIDEO_LISTING_PAGE_SIZE));
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

function seedPlaylist(
  initial: readonly GalleryMainItem[],
  startItemId?: string | null,
): GalleryMainItem[] {
  const stream = initial.filter(isStreamVideoItem);
  if (!startItemId) return stream;
  const head = stream.find((item) => item.id === startItemId);
  if (!head) return stream;
  return [head, ...stream.filter((item) => item.id !== startItemId)];
}

/**
 * Surface Video (Reels) — chỉ Cloudflare Stream upload, UI kiểu Facebook.
 * Mount mới mỗi lần click listing (`key=startId`); playlist đã xếp clip chọn lên đầu.
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
    seedPlaylist(initialItems, startItemId),
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(
    () => seedPlaylist(initialItems, startItemId).length === 0,
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    pickStartId(seedPlaylist(initialItems, startItemId), startItemId),
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [opened, setOpened] = useState(
    () => seedPlaylist(initialItems, startItemId).length > 0,
  );

  const activeIndex = useMemo(() => {
    if (!activeId) return 0;
    const idx = items.findIndex((item) => item.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [activeId, items]);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  useEffect(() => {
    /* Chỉ bootstrap khi session chưa có clip (deep link). Không sync lại từ listing. */
    if (items.length > 0) return;

    let cancelled = false;
    loadingRef.current = true;
    setBootstrapping(true);
    setLoading(true);
    void (async () => {
      try {
        const page = await fetchVideoPage(endpoint, 0);
        if (cancelled || !page) return;
        const seeded = seedPlaylist(page.items, startItemId);
        setItems(seeded);
        setHasMore(page.hasMore);
        setOffset(page.nextOffset);
        setActiveId(pickStartId(seeded, startItemId));
        setOpened(seeded.length > 0);
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
    // Mount-once — key=startId ở parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, startItemId]);

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

  const goBy = useCallback(
    (dir: -1 | 1) => {
      const list = itemsRef.current;
      const next = activeIndexRef.current + dir;
      if (next < 0) return;
      if (next >= list.length) {
        if (hasMoreRef.current) void loadMore();
        return;
      }
      const id = list[next]?.id;
      if (!id) return;
      setActiveId(id);
      replaceVideoPlayUrl(id);
    },
    [loadMore],
  );
  const goByRef = useRef(goBy);
  goByRef.current = goBy;

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      const h = root.clientHeight;
      if (h > 0) {
        root.style.setProperty("--wj-reel-slide-h", `${h}px`);
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    return () => ro.disconnect();
  }, [items.length]);

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

  const pinnedStartRef = useRef(false);
  /* Deep link: clip chưa có trong trang đầu → tải tiếp, rồi xếp lên đầu một lần. */
  useEffect(() => {
    if (!startItemId) {
      setOpened(true);
      return;
    }
    const idx = items.findIndex((item) => item.id === startItemId);
    if (idx < 0) {
      if (!hasMore || loadingRef.current || bootstrapping) return;
      void loadMore();
      return;
    }
    if (idx > 0 && !pinnedStartRef.current) {
      pinnedStartRef.current = true;
      setItems((prev) => seedPlaylist(prev, startItemId));
      setActiveId(startItemId);
    } else {
      pinnedStartRef.current = true;
    }
    setOpened(true);
  }, [startItemId, items, hasMore, bootstrapping, loadMore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!onClose) return;
        e.preventDefault();
        onClose();
        return;
      }
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        t.closest(".wj-reel-timeline, input, textarea, [contenteditable='true']")
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j") {
        e.preventDefault();
        goByRef.current(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k") {
        e.preventDefault();
        goByRef.current(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    let locked = false;
    let acc = 0;
    let unlockTimer = 0;
    const panLock = WORLD_JOURNEY_TAB_PAN_MS + 80;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (locked) return;
      acc += e.deltaY;
      if (Math.abs(acc) < 48) return;
      const dir: -1 | 1 = acc > 0 ? 1 : -1;
      acc = 0;
      locked = true;
      goByRef.current(dir);
      window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(() => {
        locked = false;
      }, panLock);
    };

    let startY = 0;
    let startX = 0;
    let tracking = false;
    const ignoreSwipe = (t: EventTarget | null) =>
      t instanceof Element &&
      Boolean(
        t.closest(
          ".wj-reel-timeline, .wj-reel-rail, .wj-reel-meta",
        ),
      );
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (ignoreSwipe(e.target)) return;
      tracking = true;
      startY = e.clientY;
      startX = e.clientX;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      if (locked) return;
      const dy = e.clientY - startY;
      const dx = e.clientX - startX;
      if (Math.abs(dy) < 56 || Math.abs(dy) < Math.abs(dx) * 1.15) return;
      locked = true;
      const blockClick = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      root.addEventListener("click", blockClick, { capture: true, once: true });
      goByRef.current(dy < 0 ? 1 : -1);
      window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(() => {
        locked = false;
      }, panLock);
    };
    const onPointerCancel = () => {
      tracking = false;
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerCancel);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerCancel);
      window.clearTimeout(unlockTimer);
    };
  }, [items.length]);

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
    return <div className="wj-video-feed-wrap">{empty}</div>;
  }

  return (
    <div className="wj-video-feed-wrap">
      <div className="wj-video-feed" ref={scrollerRef} aria-label="Video">
        <div
          className="wj-reel-track"
          style={
            {
              "--wj-reel-i": String(activeIndex),
            } as CSSProperties
          }
        >
          {items.map((item, index) => {
            const active = activeId === item.id;
            const preload =
              !active &&
              index > activeIndex &&
              index <= activeIndex + REEL_IFRAME_PRELOAD;
            return (
              <div key={item.id} className="wj-reel-snap" data-reel-id={item.id}>
                <ReelSlide
                  item={item}
                  active={active}
                  preload={preload}
                  canPlay={active && opened}
                />
              </div>
            );
          })}
        </div>
        {loading ? (
          <div className="wj-reel-loading" role="status">
            Đang tải thêm…
          </div>
        ) : null}
      </div>
    </div>
  );
}
