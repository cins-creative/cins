"use client";

import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { GalleryItemVisual } from "@/components/journey/GalleryItemVisual";
import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";
import { GALLERY_GRID_IMAGE_SIZES } from "@/lib/cloudflare/cf-variant-url";
import {
  buildStreamIframeUrl,
  buildStreamThumbnailAtTime,
} from "@/lib/cloudflare/stream-embed";
import {
  applyStreamAudio,
  bindStreamPlayer,
  playStreamWithAudio,
  type StreamPlayer,
} from "@/lib/cloudflare/stream-player-sdk";
import { useT } from "@/lib/i18n/use-t";
import { VIDEO_FEED_MAX_ASPECT } from "@/lib/journey/video-canvas-ratio";

import "./wj-list-player.css";

function formatReelTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function listingIframeSrc(uid: string): string {
  const params = new URLSearchParams({
    autoplay: "false",
    muted: "true",
    controls: "false",
    preload: "auto",
    loop: "false",
  });
  return `${buildStreamIframeUrl(uid)}?${params.toString()}`;
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

export type StreamInlineClip = {
  id: string;
  streamUid?: string | null;
  src?: string | null;
  masonrySrc?: string | null;
  videoPreviewSrc?: string | null;
  label?: string;
  width?: number;
  height?: number;
  videoProcessing?: boolean;
};

type Props = {
  item: StreamInlineClip;
  thumbAspect?: number;
  /** Video đang snap đáy khung vào đáy màn hình → autoplay. */
  active: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  onOpenViewer?: () => void;
  onActivate: () => void;
  rootRef: (el: HTMLDivElement | null) => void;
  /** Khung cha đã set aspect — player fill 100%. */
  fillParent?: boolean;
};

export function WorldJourneyVideoListingPlayer({
  item,
  thumbAspect,
  active,
  muted,
  onToggleMuted,
  onOpenViewer,
  onActivate,
  rootRef,
  fillParent = false,
}: Props) {
  const t = useT();
  const uid = item.streamUid?.trim() ?? "";
  const visualSrc = item.masonrySrc?.trim() || item.src || "";
  const frameAspect = Math.max(thumbAspect ?? 16 / 9, VIDEO_FEED_MAX_ASPECT);
  const [loopOn, setLoopOn] = useState(true);
  const [paused, setPaused] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubRatio, setScrubRatio] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<StreamPlayer | null>(null);
  const userPausedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const seekRafRef = useRef(0);
  const activeRef = useRef(active);
  const mutedRef = useRef(muted);
  const loopOnRef = useRef(loopOn);
  const inViewIoRef = useRef<IntersectionObserver | null>(null);
  activeRef.current = active;
  mutedRef.current = muted;
  loopOnRef.current = loopOn;
  const canControl = Boolean(uid) && !item.videoProcessing;
  const [inView, setInView] = useState(false);
  const iframeSrc =
    canControl && (active || inView) ? listingIframeSrc(uid) : null;
  const progress =
    duration > 0
      ? Math.min(
          100,
          Math.max(0, (scrubbing ? scrubRatio : currentTime / duration) * 100),
        )
      : 0;
  const previewThumb =
    scrubbing && duration > 0 && uid
      ? buildStreamThumbnailAtTime(uid, scrubRatio * duration)
      : null;

  useEffect(() => {
    const onFs = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      const current =
        document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsFullscreen(current === stageRef.current);
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el || !iframeSrc) {
      playerRef.current = null;
      return;
    }
    let cancelled = false;
    let player: StreamPlayer | null = null;

    const onPlay = () => {
      if (cancelled || !player) return;
      if (userPausedRef.current || !activeRef.current) {
        player.pause();
        setPaused(true);
        return;
      }
      applyStreamAudio(player, mutedRef.current);
      setPaused(false);
    };
    const onPause = () => {
      if (cancelled) return;
      setPaused(true);
    };
    const onTime = () => {
      if (cancelled || !player || scrubbingRef.current) return;
      setCurrentTime(player.currentTime || 0);
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
    const onEnded = () => {
      if (cancelled || !player) return;
      if (!loopOnRef.current || !activeRef.current) return;
      if (userPausedRef.current) return;
      player.currentTime = 0;
      void player.play().catch(() => {
        postStreamEvent(el, "play");
      });
    };

    const detach = () => {
      if (!player) return;
      player.removeEventListener("play", onPlay);
      player.removeEventListener("playing", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("timeupdate", onTime);
      player.removeEventListener("durationchange", onMeta);
      player.removeEventListener("loadedmetadata", onMeta);
      player.removeEventListener("ended", onEnded);
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
        next.addEventListener("ended", onEnded);
        next.loop = loopOnRef.current;
        applyStreamAudio(next, mutedRef.current);
        if (activeRef.current && !userPausedRef.current) {
          setPaused(false);
          void next.play().catch(() => {
            if (mutedRef.current) {
              applyStreamAudio(next, true);
              void next.play();
              return;
            }
            void next.play();
          });
        } else {
          next.pause();
          setPaused(true);
        }
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
  }, [iframeSrc]);

  useEffect(() => {
    const player = playerRef.current;
    const el = iframeRef.current;
    if (!active) {
      userPausedRef.current = false;
      setPaused(true);
      if (player) player.pause();
      else postStreamEvent(el, "pause");
      return;
    }
    if (userPausedRef.current) return;
    setPaused(false);
    if (player) {
      player.loop = loopOnRef.current;
      applyStreamAudio(player, mutedRef.current);
      void player.play().catch(() => {
        if (mutedRef.current) {
          applyStreamAudio(player, true);
          void player.play().catch(() => {
            postStreamEvent(el, "play");
          });
          return;
        }
        postStreamEvent(el, "play");
      });
      return;
    }
    postStreamEvent(el, "play");
  }, [active, iframeSrc]);

  useEffect(() => {
    const player = playerRef.current;
    const el = iframeRef.current;
    if (!player) return;
    applyStreamAudio(player, muted);
    if (!muted && activeRef.current && !userPausedRef.current) {
      void player.play().catch(() => {
        postStreamEvent(el, "play");
      });
    }
  }, [muted]);

  useEffect(() => {
    const player = playerRef.current;
    if (player) player.loop = loopOn;
  }, [loopOn]);

  const togglePlayback = useCallback(() => {
    onActivate();
    const el = iframeRef.current;
    const player = playerRef.current;
    if (paused) {
      userPausedRef.current = false;
      setPaused(false);
      if (player) {
        applyStreamAudio(player, mutedRef.current);
        void player.play().catch(() => {
          if (mutedRef.current) {
            applyStreamAudio(player, true);
            void player.play();
            return;
          }
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
    postStreamEvent(el, "pause");
  }, [onActivate, paused]);

  const seekToRatio = useCallback(
    (ratio: number) => {
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
    },
    [duration],
  );

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
      onActivate();
      const track = e.currentTarget;
      track.setPointerCapture(e.pointerId);
      const player = playerRef.current;
      wasPlayingRef.current = player ? !player.paused : !paused;
      if (player && !player.paused) player.pause();
      scrubbingRef.current = true;
      setScrubbing(true);
      seekToRatio(ratioFromPointer(e));
    },
    [onActivate, paused, ratioFromPointer, seekToRatio],
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
          applyStreamAudio(player, mutedRef.current);
          void player.play().catch(() => {
            if (mutedRef.current) {
              applyStreamAudio(player, true);
              void player.play();
            }
          });
        }
      }
      wasPlayingRef.current = false;
    },
    [ratioFromPointer, seekToRatio],
  );

  const setRoot = useCallback(
    (el: HTMLDivElement | null) => {
      stageRef.current = el;
      rootRef(el);
      inViewIoRef.current?.disconnect();
      inViewIoRef.current = null;
      if (!el) {
        setInView(false);
        return;
      }
      const io = new IntersectionObserver(
        ([entry]) => {
          setInView(
            Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0.08),
          );
        },
        { threshold: [0, 0.08, 0.25, 0.5], rootMargin: "160px 0px" },
      );
      io.observe(el);
      inViewIoRef.current = io;
    },
    [rootRef],
  );

  useEffect(
    () => () => {
      inViewIoRef.current?.disconnect();
    },
    [],
  );

  return (
    <div
      ref={setRoot}
      className={"wj-list-player" + (fillParent ? " is-fill" : "")}
      style={fillParent ? undefined : { aspectRatio: String(frameAspect) }}
    >
      <div className="wj-list-player-media">
        {item.videoProcessing ? (
          <VideoProcessingPlaceholder />
        ) : (
          <>
            {visualSrc ? (
              <GalleryItemVisual
                src={visualSrc}
                sizes={GALLERY_GRID_IMAGE_SIZES}
                width={item.width}
                height={item.height}
                alt={item.label ?? ""}
                isVideo
                videoProcessing={item.videoProcessing}
                videoPreviewSrc={item.videoPreviewSrc}
              />
            ) : null}
            {iframeSrc ? (
              <iframe
                ref={iframeRef}
                className="wj-list-player-iframe"
                src={iframeSrc}
                title={item.label || "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                tabIndex={-1}
                aria-hidden
              />
            ) : null}
          </>
        )}
      </div>
      <button
        type="button"
        className="wj-list-player-hit"
        aria-label={
          onOpenViewer
            ? `Mở trình xem video ${item.label ?? ""}`
            : paused
              ? "Phát video"
              : "Tạm dừng"
        }
        onClick={() => {
          if (isFullscreen) return;
          if (onOpenViewer) {
            onOpenViewer();
            return;
          }
          togglePlayback();
        }}
      />
      {canControl ? (
        <div
          className={
            "wj-reel-timeline is-pinned" + (scrubbing ? " is-scrubbing" : "")
          }
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="wj-reel-timeline-btn"
            aria-label={paused ? "Phát video" : "Tạm dừng"}
            onClick={(e) => {
              e.stopPropagation();
              togglePlayback();
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
            tabIndex={0}
            onPointerDown={onTimelinePointerDown}
            onPointerMove={onTimelinePointerMove}
            onPointerUp={onTimelinePointerUp}
            onPointerCancel={onTimelinePointerUp}
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
            className={"wj-reel-timeline-btn" + (muted ? "" : " is-on")}
            aria-label={muted ? t("rail.unmute") : t("rail.mute")}
            aria-pressed={!muted}
            onClick={(e) => {
              e.stopPropagation();
              const nextMuted = !muted;
              onToggleMuted();
              const player = playerRef.current;
              if (player) {
                void playStreamWithAudio(
                  player,
                  nextMuted,
                  iframeRef.current,
                );
              }
            }}
          >
            {muted ? (
              <VolumeX size={16} strokeWidth={2.2} />
            ) : (
              <Volume2 size={16} strokeWidth={2.2} />
            )}
          </button>
          <button
            type="button"
            className={"wj-reel-timeline-btn" + (loopOn ? " is-on" : "")}
            aria-label={loopOn ? "Tắt phát lại" : "Bật phát lại"}
            aria-pressed={loopOn}
            onClick={(e) => {
              e.stopPropagation();
              setLoopOn((prev) => !prev);
            }}
          >
            <Repeat size={16} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="wj-reel-timeline-btn"
            aria-label={
              isFullscreen ? "Thoát toàn màn hình" : "Phóng toàn màn hình"
            }
            onClick={(e) => {
              e.stopPropagation();
              void toggleElementFullscreen(stageRef.current);
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
    </div>
  );
}
