"use client";

import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useWorldJourneyFeedAudio } from "@/components/cins/world-journey/WorldJourneyFeedAudioContext";
import { GalleryItemVisual } from "@/components/journey/GalleryItemVisual";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import {
  applyStreamAudio,
  bindStreamPlayer,
  pauseStream,
  playStreamWithAudio,
} from "@/lib/cloudflare/stream-player-sdk";
import { GALLERY_GRID_IMAGE_SIZES } from "@/lib/cloudflare/cf-variant-url";
import { WORLD_JOURNEY_VIDEO_RAIL_SIZE } from "@/lib/cins/worldJourneyFeedConstants";
import { useT } from "@/lib/i18n/use-t";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { getNameInitials } from "@/lib/journey/profile";

const SWIPE_THRESHOLD_PX = 48;
const WHEEL_THRESHOLD = 48;
const WHEEL_COOLDOWN_MS = 420;
const STEP_LOCK_MS = 380;
const STRIP_LOOP_COPIES = 3;
/** Buffer đầu clip hàng xóm rồi pause — vào giữa chỉ play, không reload iframe. */
const COVERFLOW_WARM_SECONDS = 2.5;

function postStreamPlay(el: HTMLIFrameElement | null) {
  try {
    el?.contentWindow?.postMessage(JSON.stringify({ event: "play" }), "*");
  } catch {
    /* ignore */
  }
}

function stripCopyWidth(el: HTMLElement): number {
  return el.scrollWidth / STRIP_LOOP_COPIES;
}

function railIframeSrc(uid: string, loop: boolean): string {
  const params = new URLSearchParams({
    autoplay: "false",
    muted: "true",
    controls: "false",
    preload: "auto",
    loop: loop ? "true" : "false",
    startTime: "0",
  });
  return `${buildStreamIframeUrl(uid)}?${params.toString()}`;
}

export type VideoRailOpenPayload = {
  item: GalleryMainItem;
  items: GalleryMainItem[];
};

type Props = {
  items: ReadonlyArray<GalleryMainItem>;
  slotKey: string;
  railIndex: number;
  onOpenVideo: (payload: VideoRailOpenPayload) => void;
};

/**
 * Coverflow 3D — card giữa thẳng, hai bên rotateY; chuyển thì xoay vào tâm.
 * Desktop: nút L/R + wheel khi hover. Mobile: swipe ngang.
 */
export function WorldJourneyVideoRail({
  items: rawItems,
  slotKey,
  railIndex,
  onOpenVideo,
}: Props) {
  const items = useMemo(
    () =>
      rawItems
        .filter((item) => Boolean(item.streamUid?.trim()))
        .slice(0, WORLD_JOURNEY_VIDEO_RAIL_SIZE),
    [rawItems],
  );
  const t = useT();
  const n = items.length;
  const isStrip = railIndex <= 1 || slotKey === "top";

  const [activeIndex, setActiveIndex] = useState(0);
  const [animDir, setAnimDir] = useState<0 | 1 | -1>(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverLoopKey, setHoverLoopKey] = useState<string | null>(null);
  const [activeLoopKey, setActiveLoopKey] = useState<string | null>(() => {
    const first = items[0];
    if (!first) return null;
    if (isStrip && items.length >= 2) return `${first.id}-c0`;
    return first.id;
  });
  const [stripCopy, setStripCopy] = useState(0);
  const [stripDragging, setStripDragging] = useState(false);
  const [railInView, setRailInView] = useState(false);
  const { muted, toggleMuted } = useWorldJourneyFeedAudio();
  const lockUntilRef = useRef(0);
  const wheelAccRef = useRef(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const stripTrackRef = useRef<HTMLDivElement | null>(null);
  const playersRef = useRef(
    new Map<string, { player: Awaited<ReturnType<typeof bindStreamPlayer>>; iframe: HTMLIFrameElement }>(),
  );
  const mutedRef = useRef(true);
  const hoverLoopKeyRef = useRef<string | null>(null);
  const activeLoopKeyRef = useRef<string | null>(null);
  const isStripRef = useRef(isStrip);
  mutedRef.current = muted;
  hoverLoopKeyRef.current = hoverLoopKey;
  activeLoopKeyRef.current = activeLoopKey;
  isStripRef.current = isStrip;

  const hearingKey = useCallback(() => {
    if (isStripRef.current) return hoverLoopKeyRef.current;
    return hoverLoopKeyRef.current ?? activeLoopKeyRef.current;
  }, []);

  const displayCards = useMemo(() => {
    if (!isStrip || items.length < 2) {
      return items.map((item, sourceIndex) => ({
        item,
        loopKey: item.id,
        sourceIndex,
      }));
    }
    const out: Array<{
      item: GalleryMainItem;
      loopKey: string;
      sourceIndex: number;
    }> = [];
    for (let copy = 0; copy < STRIP_LOOP_COPIES; copy += 1) {
      items.forEach((item, sourceIndex) => {
        out.push({
          item,
          loopKey: `${item.id}-c${copy}`,
          sourceIndex,
        });
      });
    }
    return out;
  }, [isStrip, items]);

  const stripLoops = isStrip && items.length >= 2;
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    axis: "undecided" | "x" | "y";
  } | null>(null);
  const stripDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScroll: number;
    moved: boolean;
    axis: "undecided" | "x" | "y";
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setActiveIndex(0);
    setAnimDir(0);
    setHoverIndex(null);
    setHoverLoopKey(null);
    setStripCopy(0);
    setActiveLoopKey(
      isStrip && n >= 2 && items[0] ? `${items[0].id}-c0` : items[0]?.id ?? null,
    );
    wheelAccRef.current = 0;
  }, [slotKey, n, isStrip, items]);

  useEffect(() => {
    if (isStrip) return;
    setActiveLoopKey(items[activeIndex]?.id ?? null);
  }, [isStrip, items, activeIndex]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || isStrip) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          setRailInView(false);
          return;
        }
        setRailInView(entry.isIntersecting);
      },
      { threshold: [0, 0.35, 0.55, 0.72, 0.9, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isStrip, slotKey, n]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (n <= 1) return;
      const now = performance.now();
      if (now < lockUntilRef.current) return;
      lockUntilRef.current = now + STEP_LOCK_MS;
      setAnimDir(dir);
      setActiveIndex((cur) => (cur + dir + n) % n);
      window.setTimeout(() => setAnimDir(0), STEP_LOCK_MS);
    },
    [n],
  );

  const goNext = useCallback(() => step(1), [step]);
  const goPrev = useCallback(() => step(-1), [step]);

  const onToggleAudio = useCallback(() => {
    const nextMuted = !muted;
    toggleMuted();
    const key = hearingKey();
    for (const [loopKey, bound] of playersRef.current) {
      const hearing = !nextMuted && key != null && loopKey === key;
      if (hearing) {
        void playStreamWithAudio(bound.player, false, bound.iframe);
      } else {
        applyStreamAudio(bound.player, true, bound.iframe);
      }
    }
  }, [muted, toggleMuted, hearingKey]);

  useEffect(() => {
    const key = hearingKey();
    for (const [loopKey, bound] of playersRef.current) {
      const hearing = !muted && key != null && loopKey === key;
      if (hearing) {
        void playStreamWithAudio(bound.player, false, bound.iframe);
      } else {
        applyStreamAudio(bound.player, true, bound.iframe);
      }
    }
  }, [muted, hearingKey]);

  useEffect(() => {
    if (!isStrip) return;
    if (hoverLoopKey) return;
    for (const bound of playersRef.current.values()) {
      pauseStream(bound.player, bound.iframe);
    }
  }, [isStrip, hoverLoopKey]);

  const registerPlayer = useCallback(
    (
      loopKey: string,
      player: Awaited<ReturnType<typeof bindStreamPlayer>>,
      iframe: HTMLIFrameElement,
    ) => {
      playersRef.current.set(loopKey, { player, iframe });
      const playingKey = hearingKey();
      if (playingKey === loopKey) {
        applyStreamAudio(player, mutedRef.current, iframe);
      } else {
        applyStreamAudio(player, true, iframe);
      }
    },
    [hearingKey],
  );

  const unregisterPlayer = useCallback((loopKey: string) => {
    playersRef.current.delete(loopKey);
  }, []);

  const wrapInfiniteScroll = useCallback(() => {
    const el = stripTrackRef.current;
    if (!el || !stripLoops) return;
    const setWidth = stripCopyWidth(el);
    if (setWidth <= 0) return;
    if (el.scrollLeft < setWidth * 0.25) {
      /* Đầu track (scroll≈0) giữ copy 0; chỉ wrap khi đã kéo vào giữa. */
      if (el.scrollLeft > 8) el.scrollLeft += setWidth;
    } else if (el.scrollLeft > setWidth * 1.75) {
      el.scrollLeft -= setWidth;
    }
    const copy = Math.min(
      2,
      Math.max(0, Math.round(el.scrollLeft / setWidth)),
    );
    setStripCopy(copy);
  }, [stripLoops]);

  const handleOpen = useCallback(
    (item: GalleryMainItem) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      onOpenVideo({ item, items: [...items] });
    },
    [items, onOpenVideo],
  );

  /* Chỉ hijack wheel ngang (đổi clip). Vuốt/lăn dọc → cuộn trang. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || n <= 1 || isStrip) return;
    const handler = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (Math.abs(event.deltaX) < 2) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      wheelAccRef.current += event.deltaX;
      if (Math.abs(wheelAccRef.current) < WHEEL_THRESHOLD) return;
      const dir: 1 | -1 = wheelAccRef.current > 0 ? 1 : -1;
      wheelAccRef.current = 0;
      const now = performance.now();
      if (now < lockUntilRef.current) return;
      step(dir);
      lockUntilRef.current = Math.max(
        lockUntilRef.current,
        now + WHEEL_COOLDOWN_MS,
      );
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [n, step, isStrip]);

  useEffect(() => {
    if (!isStrip || n === 0) return;
    const track = stripTrackRef.current;
    if (!track) return;
    const cards = [...track.querySelectorAll<HTMLElement>(".wj-video-rail-card")];
    if (cards.length === 0) return;
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        let bestCard: HTMLElement | null = null;
        let bestRatio = 0.15;
        for (const card of cards) {
          const ratio = ratios.get(card) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestCard = card;
          }
        }
        if (!bestCard) return;
        const loopKey = bestCard.getAttribute("data-loop-key");
        const itemId = bestCard.getAttribute("data-item-id");
        if (loopKey) setActiveLoopKey(loopKey);
        if (!itemId) return;
        const idx = items.findIndex((item) => item.id === itemId);
        if (idx >= 0) setActiveIndex(idx);
      },
      { root: track, threshold: [0.15, 0.4, 0.6, 0.8, 1] },
    );
    for (const card of cards) io.observe(card);
    return () => io.disconnect();
  }, [isStrip, n, items, displayCards.length]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      axis: "undecided",
    };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.axis === "undecided") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        dragRef.current = null;
        return;
      }
      drag.axis = "x";
      drag.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const endPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const dx = e.clientX - drag.startX;
      if (drag.axis === "x" && Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
        suppressClickRef.current = true;
        /* Vuốt trái → video kế (front ra sau); vuốt phải → quay lại. */
        step(dx < 0 ? 1 : -1);
      }
      dragRef.current = null;
    },
    [step],
  );

  const onStripPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const el = stripTrackRef.current;
      if (!el) return;
      stripDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startScroll: el.scrollLeft,
        moved: false,
        axis: "undecided",
      };
      if (e.pointerType === "mouse") {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  const onStripPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = stripDragRef.current;
      const el = stripTrackRef.current;
      if (!drag || !el || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (drag.axis === "undecided") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (e.pointerType !== "mouse" && Math.abs(dy) >= Math.abs(dx)) {
          stripDragRef.current = null;
          return;
        }
        if (Math.abs(dx) < 8) return;
        drag.axis = "x";
        drag.moved = true;
        setStripDragging(true);
        if (e.pointerType !== "mouse" && !el.hasPointerCapture(e.pointerId)) {
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
      }
      if (drag.axis !== "x") return;
      el.scrollLeft = drag.startScroll - dx;
      wrapInfiniteScroll();
    },
    [wrapInfiniteScroll],
  );

  const endStripPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = stripDragRef.current;
      const el = stripTrackRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (el?.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      if (drag.moved) {
        suppressClickRef.current = true;
        wrapInfiniteScroll();
        setStripDragging(false);
      }
      stripDragRef.current = null;
    },
    [wrapInfiniteScroll],
  );

  useEffect(() => {
    const el = stripTrackRef.current;
    if (!el || !isStrip) return;
    const onTouchMove = (event: TouchEvent) => {
      if (stripDragRef.current?.axis !== "x") return;
      if (event.cancelable) event.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    return () => {
      el.removeEventListener("touchmove", onTouchMove, { capture: true });
    };
  }, [isStrip, n]);

  if (n === 0) return null;

  return (
    <aside
      ref={rootRef}
      className={
        "wj-video-rail" +
        (isStrip ? " wj-video-rail--strip" : " wj-video-rail--coverflow") +
        (animDir === 1 ? " is-anim-next" : "") +
        (animDir === -1 ? " is-anim-prev" : "")
      }
      aria-label="Video dọc"
      data-rail-index={railIndex}
      data-rail-slot={slotKey}
      data-rail-count={n}
    >
      <div className="wj-video-rail-stage">
        {!isStrip && n > 1 ? (
          <button
            type="button"
            className="wj-video-rail-nav wj-video-rail-nav--prev"
            aria-label="Video trước"
            onClick={goPrev}
          >
            <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}

        <div
          ref={isStrip ? stripTrackRef : undefined}
          className={
            "wj-video-rail-stack" + (stripDragging ? " is-dragging" : "")
          }
          role="list"
          onPointerDown={isStrip ? onStripPointerDown : onPointerDown}
          onPointerMove={isStrip ? onStripPointerMove : onPointerMove}
          onPointerUp={isStrip ? endStripPointer : endPointer}
          onPointerCancel={isStrip ? endStripPointer : endPointer}
          onScroll={stripLoops ? wrapInfiniteScroll : undefined}
          onPointerLeave={
            isStrip
              ? (event) => {
                  const next = event.relatedTarget;
                  if (next instanceof Node && event.currentTarget.contains(next)) {
                    return;
                  }
                  setHoverIndex(null);
                  setHoverLoopKey(null);
                }
              : undefined
          }
        >
          {displayCards.map(({ item, loopKey, sourceIndex }, cardIndex) => {
            const offset = isStrip
              ? 0
              : circularOffset(sourceIndex, activeIndex, n);
            const copy = stripLoops && n > 0 ? Math.floor(cardIndex / n) : 0;
            const visibleCopy = stripLoops ? stripCopy : 0;
            const playing = isStrip
              ? copy === visibleCopy && loopKey === hoverLoopKey
              : railInView && sourceIndex === (hoverIndex ?? activeIndex);
            const clipMounted = isStrip
              ? copy === visibleCopy
              : true;
            return (
              <VideoStackCard
                key={loopKey}
                loopKey={loopKey}
                item={item}
                offset={offset}
                total={n}
                layout={isStrip ? "strip" : "coverflow"}
                playing={playing}
                clipMounted={clipMounted}
                inView={isStrip || railInView}
                muted={muted}
                onOpen={() => handleOpen(item)}
                onFocusCard={() => setActiveIndex(sourceIndex)}
                onHover={() => {
                  setHoverIndex(sourceIndex);
                  setHoverLoopKey(loopKey);
                }}
                onEnded={isStrip || n <= 1 ? undefined : goNext}
                onBindPlayer={registerPlayer}
                onUnbindPlayer={unregisterPlayer}
              />
            );
          })}
        </div>

        {!isStrip && n > 1 ? (
          <button
            type="button"
            className="wj-video-rail-nav wj-video-rail-nav--next"
            aria-label="Video tiếp"
            onClick={goNext}
          >
            <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}

        <button
          type="button"
          className={"wj-video-rail-audio" + (muted ? "" : " is-hearing is-on")}
          aria-label={muted ? t("rail.unmute") : t("rail.mute")}
          aria-pressed={!muted}
          onClick={onToggleAudio}
        >
          {muted ? (
            <VolumeX size={16} strokeWidth={2.25} aria-hidden />
          ) : (
            <Volume2 size={16} strokeWidth={2.25} aria-hidden />
          )}
        </button>
      </div>

      {!isStrip && n > 1 ? (
        <div className="wj-video-rail-dots" role="tablist" aria-label="Chọn video">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={
                "wj-video-rail-dot" + (i === activeIndex ? " is-active" : "")
              }
              aria-selected={i === activeIndex}
              aria-label={`Video ${i + 1}`}
              onClick={() => {
                setActiveIndex(i);
                setActiveLoopKey(item.id);
              }}
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function circularOffset(index: number, active: number, n: number): number {
  let d = index - active;
  const half = n / 2;
  if (d > half) d -= n;
  if (d < -half) d += n;
  return d;
}

function coverflowStyle(
  offset: number,
  total: number,
): { transform: string; zIndex: number; opacity: number } {
  const abs = Math.abs(offset);
  if (abs >= 2) {
    return {
      transform: `translateX(${offset * 110}%) rotate(${offset * 16}deg) scale(0.72)`,
      zIndex: 0,
      opacity: 0,
    };
  }
  if (abs === 0) {
    return { transform: "none", zIndex: total, opacity: 1 };
  }
  const x = offset * 86;
  const y = 16;
  const rotZ = offset * 12;
  return {
    transform: `translateX(${x}%) translateY(calc(${y}% - 40px)) rotate(${rotZ}deg) scale(0.9)`,
    zIndex: total - abs,
    opacity: 1,
  };
}

function RailClip({
  item,
  active,
  mounted,
  muted,
  loop,
  inView,
  bindKey,
  onEnded,
  onBindPlayer,
  onUnbindPlayer,
}: {
  item: GalleryMainItem;
  active: boolean;
  mounted: boolean;
  muted: boolean;
  loop: boolean;
  inView: boolean;
  bindKey: string;
  onEnded?: () => void;
  onBindPlayer?: (
    loopKey: string,
    player: Awaited<ReturnType<typeof bindStreamPlayer>>,
    iframe: HTMLIFrameElement,
  ) => void;
  onUnbindPlayer?: (loopKey: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Awaited<ReturnType<typeof bindStreamPlayer>> | null>(
    null,
  );
  const activeRef = useRef(active);
  activeRef.current = active;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const inViewRef = useRef(inView);
  inViewRef.current = inView;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const warmingRef = useRef(false);
  const warmedRef = useRef(false);
  const advancedRef = useRef(false);
  const playGenRef = useRef(0);
  const uid = item.streamUid?.trim() || "";
  const poster = item.masonrySrc?.trim() || item.src;
  const src = useMemo(
    () => (uid ? railIframeSrc(uid, loop) : ""),
    [uid, loop],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    playerRef.current = null;
    warmedRef.current = false;
    warmingRef.current = false;
    advancedRef.current = false;
  }, [src]);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el || !src || !mounted) return;
    let cancelled = false;
    let player: Awaited<ReturnType<typeof bindStreamPlayer>> | null = null;

    const stopHard = () => {
      if (!player) return;
      pauseStream(player, el);
      try {
        player.currentTime = 0;
      } catch {
        /* ignore */
      }
    };

    const applyMute = () => {
      if (!player) return;
      applyStreamAudio(
        player,
        !activeRef.current || mutedRef.current,
        el,
      );
    };

    const fireAdvance = () => {
      if (!activeRef.current || !inViewRef.current || loopRef.current || warmingRef.current) return;
      if (advancedRef.current) return;
      advancedRef.current = true;
      onEndedRef.current?.();
    };

    const kickPlay = () => {
      if (!player || !activeRef.current || !inViewRef.current) return;
      warmingRef.current = false;
      const gen = ++playGenRef.current;
      void playStreamWithAudio(player, mutedRef.current, el).then(() => {
        if (cancelled || gen !== playGenRef.current || !activeRef.current) {
          stopHard();
        }
      });
    };

    const startWarm = () => {
      if (!player || activeRef.current || warmedRef.current) return;
      if (!inViewRef.current) return;
      if (loopRef.current) return;
      warmingRef.current = true;
      applyStreamAudio(player, true, el);
      void player.play().catch(() => {
        postStreamPlay(el);
      });
    };

    const capWarm = () => {
      if (cancelled || !player || activeRef.current) return;
      warmingRef.current = false;
      stopHard();
      warmedRef.current = true;
    };

    const onUnexpectedPlay = () => {
      if (cancelled || !player) return;
      if (activeRef.current && inViewRef.current) return;
      if (warmingRef.current) return;
      pauseStream(player, el);
    };

    const syncPlayback = () => {
      if (cancelled || !player) return;
      player.loop = loopRef.current;
      applyMute();
      if (activeRef.current) {
        advancedRef.current = false;
        kickPlay();
        return;
      }
      startWarm();
    };

    const onTime = () => {
      if (cancelled || !player) return;
      if (warmingRef.current) {
        const cap = Math.min(
          COVERFLOW_WARM_SECONDS,
          player.duration || COVERFLOW_WARM_SECONDS,
        );
        if (player.currentTime >= cap) capWarm();
        return;
      }
      if (!activeRef.current || loopRef.current) return;
      const d = player.duration;
      if (Number.isFinite(d) && d > 0.4 && player.currentTime >= d - 0.2) {
        fireAdvance();
      }
    };

    const retryIds: number[] = [];
    const retryPlay = () => {
      if (cancelled) return;
      if (activeRef.current && inViewRef.current) kickPlay();
      else if (inViewRef.current) startWarm();
    };

    void (async () => {
      try {
        player = await bindStreamPlayer(el);
        if (cancelled) return;
        playerRef.current = player;
        onBindPlayer?.(bindKey, player, el);
        applyMute();
        player.addEventListener("loadedmetadata", () => {
          setReady(true);
          syncPlayback();
        });
        player.addEventListener("play", onUnexpectedPlay);
        player.addEventListener("timeupdate", onTime);
        player.addEventListener("ended", fireAdvance);
        setReady(true);
        syncPlayback();
        retryIds.push(
          window.setTimeout(retryPlay, 280),
          window.setTimeout(retryPlay, 900),
        );
      } catch {
        setReady(true);
        if (activeRef.current && inViewRef.current) postStreamPlay(el);
      }
    })();

    return () => {
      cancelled = true;
      for (const id of retryIds) window.clearTimeout(id);
      onUnbindPlayer?.(bindKey);
      if (player) {
        player.removeEventListener("play", onUnexpectedPlay);
        player.removeEventListener("timeupdate", onTime);
        player.removeEventListener("ended", fireAdvance);
        pauseStream(player, el);
      }
      playerRef.current = null;
    };
  }, [mounted, src, bindKey, onBindPlayer, onUnbindPlayer]);

  useEffect(() => {
    const player = playerRef.current;
    const el = iframeRef.current;
    if (!player) {
      if (active && inView) postStreamPlay(el);
      return;
    }
    player.loop = loop;
    const gen = ++playGenRef.current;
    if (active && inView) {
      warmingRef.current = false;
      advancedRef.current = false;
      void playStreamWithAudio(player, muted, el).then(() => {
        if (gen !== playGenRef.current || !activeRef.current) {
          pauseStream(player, el);
          try {
            player.currentTime = 0;
          } catch {
            /* ignore */
          }
        }
      });
      return;
    }
    pauseStream(player, el);
    try {
      player.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, [active, muted, mounted, loop, inView]);

  return (
    <>
      <GalleryItemVisual
        src={poster}
        sizes={GALLERY_GRID_IMAGE_SIZES}
        width={item.width}
        height={item.height}
        alt={item.label}
        isVideo
        videoProcessing={item.videoProcessing}
      />
      {mounted && src ? (
        <iframe
          ref={iframeRef}
          className={
            "wj-video-rail-clip" +
            (ready && (active || !loop) ? " is-ready" : "")
          }
          src={src}
          title={item.label || "Video"}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          tabIndex={-1}
          onLoad={() => {
            setReady(true);
          }}
        />
      ) : null}
    </>
  );
}

function VideoStackCard({
  item,
  loopKey,
  offset,
  total,
  layout,
  playing,
  clipMounted,
  inView,
  muted,
  onOpen,
  onFocusCard,
  onHover,
  onEnded,
  onBindPlayer,
  onUnbindPlayer,
}: {
  item: GalleryMainItem;
  loopKey: string;
  offset: number;
  total: number;
  layout: "strip" | "coverflow";
  playing: boolean;
  clipMounted: boolean;
  inView: boolean;
  muted: boolean;
  onOpen: () => void;
  onFocusCard: () => void;
  onHover?: () => void;
  onEnded?: () => void;
  onBindPlayer?: (
    loopKey: string,
    player: Awaited<ReturnType<typeof bindStreamPlayer>>,
    iframe: HTMLIFrameElement,
  ) => void;
  onUnbindPlayer?: (loopKey: string) => void;
}) {
  const isStrip = layout === "strip";
  const style = isStrip ? undefined : coverflowStyle(offset, total);
  const isFront = isStrip ? playing : offset === 0;
  const abs = Math.abs(offset);
  const visible = isStrip || abs <= 1;
  const mounted = clipMounted;
  const loop = isStrip || total <= 1;

  return (
    <article
      className={
        "wj-video-rail-card" + (isFront ? " is-front" : " is-back")
      }
      role="listitem"
      data-cover-offset={isStrip ? undefined : offset}
      data-item-id={item.id}
      data-loop-key={loopKey}
      style={style}
      aria-hidden={isStrip ? undefined : !visible}
      onPointerEnter={
        isStrip && onHover
          ? (event) => {
              if (event.pointerType === "mouse") onHover();
            }
          : undefined
      }
    >
      <div className="wj-video-rail-shell">
        <div className="wj-video-rail-thumb-wrap">
          <span className="wj-video-rail-thumb" aria-hidden>
            <RailClip
              item={item}
              active={isFront && inView}
              mounted={mounted}
              muted={muted}
              loop={loop}
              inView={inView}
              bindKey={loopKey}
              onEnded={onEnded}
              onBindPlayer={onBindPlayer}
              onUnbindPlayer={onUnbindPlayer}
            />
            {isStrip ? <VideoStackAvatar item={item} overlay /> : null}
          </span>
          <button
            type="button"
            className="wj-video-rail-card-hit"
            onClick={isStrip || isFront ? onOpen : onFocusCard}
            tabIndex={visible ? 0 : -1}
            aria-label={
              isFront || isStrip
                ? `Xem video ${item.label}`
                : `Chọn video ${item.label}`
            }
            disabled={!visible}
          />
        </div>
        {isStrip ? null : <VideoStackMeta item={item} />}
      </div>
    </article>
  );
}

function VideoStackAvatar({
  item,
  overlay = false,
}: {
  item: GalleryMainItem;
  overlay?: boolean;
}) {
  const author = item.authorName?.trim() || null;
  const avatarUrl = item.authorAvatarUrl?.trim() || null;
  const initials = getNameInitials(author, "?");

  return (
    <span
      className={
        "wj-video-rail-card-av" + (overlay ? " wj-video-rail-card-av--in-clip" : "")
      }
      aria-hidden
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" loading="lazy" />
      ) : (
        <span className="wj-video-rail-card-av-fallback">{initials}</span>
      )}
    </span>
  );
}

function VideoStackMeta({ item }: { item: GalleryMainItem }) {
  const author = item.authorName?.trim() || null;
  const authorSlug = item.authorSlug?.trim() || null;
  const avatarUrl = item.authorAvatarUrl?.trim() || null;
  const title = item.label?.trim() || null;

  const nameEl = author ? (
    <span className="wj-video-rail-card-name">{author}</span>
  ) : null;

  return (
    <div className="wj-video-rail-card-meta">
      <VideoStackAvatar item={item} />
      <div className="wj-video-rail-card-copy">
        {author && authorSlug ? (
          <JourneyUserPopover
            slug={authorSlug}
            fallbackName={author}
            fallbackAvatarUrl={avatarUrl}
          >
            {nameEl}
          </JourneyUserPopover>
        ) : (
          nameEl
        )}
        {title ? (
          <span className="wj-video-rail-card-title">{title}</span>
        ) : null}
      </div>
    </div>
  );
}
