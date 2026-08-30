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

import { GalleryItemVisual } from "@/components/journey/GalleryItemVisual";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import { bindStreamPlayer } from "@/lib/cloudflare/stream-player-sdk";
import { GALLERY_GRID_IMAGE_SIZES } from "@/lib/cloudflare/cf-variant-url";
import { WORLD_JOURNEY_VIDEO_RAIL_SIZE } from "@/lib/cins/worldJourneyFeedConstants";
import { useT } from "@/lib/i18n/use-t";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { getNameInitials } from "@/lib/journey/profile";

const SWIPE_THRESHOLD_PX = 48;
const WHEEL_THRESHOLD = 48;
const WHEEL_COOLDOWN_MS = 420;
const STEP_LOCK_MS = 380;
const PREVIEW_LOOP_SECONDS = 3;

function railIframeSrc(uid: string): string {
  const params = new URLSearchParams({
    autoplay: "false",
    muted: "true",
    controls: "false",
    preload: "auto",
    loop: "false",
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
  const [stripDragging, setStripDragging] = useState(false);
  const [muted, setMuted] = useState(true);
  const lockUntilRef = useRef(0);
  const wheelAccRef = useRef(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const stripTrackRef = useRef<HTMLDivElement | null>(null);
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
    wheelAccRef.current = 0;
  }, [slotKey, n]);

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
  const toggleMuted = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

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
    const root = rootRef.current;
    if (!root) return;
    const track = root.querySelector(".wj-video-rail-stack");
    if (!(track instanceof HTMLElement)) return;
    const cards = [...track.querySelectorAll<HTMLElement>(".wj-video-rail-card")];
    if (cards.length === 0) return;
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0.4;
        for (const card of cards) {
          const ratio = ratios.get(card) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = card.getAttribute("data-item-id");
          }
        }
        if (!bestId) return;
        const idx = items.findIndex((item) => item.id === bestId);
        if (idx >= 0) setActiveIndex(idx);
      },
      { root: track, threshold: [0.4, 0.6, 0.8, 1] },
    );
    for (const card of cards) io.observe(card);
    return () => io.disconnect();
  }, [isStrip, n, items]);

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
    },
    [],
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
        setStripDragging(false);
      }
      stripDragRef.current = null;
    },
    [],
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
          onPointerLeave={
            isStrip
              ? (event) => {
                  const next = event.relatedTarget;
                  if (next instanceof Node && event.currentTarget.contains(next)) {
                    return;
                  }
                  setHoverIndex(null);
                }
              : undefined
          }
        >
          {items.map((item, i) => {
            const offset = isStrip ? 0 : circularOffset(i, activeIndex, n);
            return (
              <VideoStackCard
                key={item.id}
                item={item}
                offset={offset}
                total={n}
                layout={isStrip ? "strip" : "coverflow"}
                playing={i === (hoverIndex ?? activeIndex)}
                muted={muted}
                onOpen={() => handleOpen(item)}
                onFocusCard={() => setActiveIndex(i)}
                onHover={() => setHoverIndex(i)}
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
          className={"wj-video-rail-audio" + (muted ? "" : " is-hearing")}
          aria-label={muted ? t("rail.unmute") : t("rail.mute")}
          aria-pressed={!muted}
          onClick={toggleMuted}
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
              onClick={() => setActiveIndex(i)}
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
}: {
  item: GalleryMainItem;
  active: boolean;
  mounted: boolean;
  muted: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Awaited<ReturnType<typeof bindStreamPlayer>> | null>(
    null,
  );
  const activeRef = useRef(active);
  activeRef.current = active;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const warmedRef = useRef(false);
  const wasActiveRef = useRef(false);
  const uid = item.streamUid?.trim() || "";
  const poster = item.masonrySrc?.trim() || item.src;
  const src = useMemo(() => (uid ? railIframeSrc(uid) : ""), [uid]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    playerRef.current = null;
    warmedRef.current = false;
    wasActiveRef.current = false;
  }, [src]);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el || !src || !mounted) return;
    let cancelled = false;
    let player: Awaited<ReturnType<typeof bindStreamPlayer>> | null = null;

    const loopHead = () => {
      if (cancelled || !player || !activeRef.current) return;
      const dur = player.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      const loopAt = Math.min(PREVIEW_LOOP_SECONDS, dur);
      if (player.currentTime >= loopAt) {
        player.currentTime = 0.05;
      }
    };

    const capWarm = () => {
      if (cancelled || !player || activeRef.current) return;
      const dur = player.duration;
      const cap =
        Number.isFinite(dur) && dur > 0
          ? Math.min(PREVIEW_LOOP_SECONDS, dur)
          : PREVIEW_LOOP_SECONDS;
      if (player.currentTime >= cap) {
        player.pause();
        player.currentTime = 0;
        warmedRef.current = true;
      }
    };

    const rewindToStart = () => {
      if (!player) return;
      try {
        player.currentTime = 0;
      } catch {
        /* ignore */
      }
    };

    const applyMute = () => {
      if (!player) return;
      player.muted = !activeRef.current || mutedRef.current;
    };

    const kickPlay = () => {
      if (!player) return;
      applyMute();
      void player.play().catch(() => {
        player.muted = true;
        void player.play().catch(() => {
          try {
            el.contentWindow?.postMessage(
              JSON.stringify({ event: "play" }),
              "*",
            );
          } catch {
            /* ignore */
          }
        });
      });
    };

    const syncPlayback = () => {
      if (cancelled || !player) return;
      player.loop = false;
      applyMute();
      if (activeRef.current) {
        wasActiveRef.current = true;
        rewindToStart();
        kickPlay();
        return;
      }
      if (!warmedRef.current) {
        kickPlay();
        return;
      }
      player.pause();
    };

    const onTime = () => {
      if (activeRef.current) loopHead();
      else capWarm();
    };

    void (async () => {
      try {
        player = await bindStreamPlayer(el);
        if (cancelled) return;
        playerRef.current = player;
        applyMute();
        player.addEventListener("timeupdate", onTime);
        player.addEventListener("loadedmetadata", () => {
          setReady(true);
          syncPlayback();
        });
        setReady(true);
        syncPlayback();
      } catch {
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      if (player) {
        player.removeEventListener("timeupdate", onTime);
        player.pause();
      }
      playerRef.current = null;
    };
  }, [mounted, src]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.loop = false;
    player.muted = !active || muted;
    if (active) {
      const firstPlay = !wasActiveRef.current;
      wasActiveRef.current = true;
      if (firstPlay) {
        try {
          player.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      void player.play().catch(() => undefined);
      return;
    }
    wasActiveRef.current = false;
    if (!warmedRef.current) {
      player.muted = true;
      void player.play().catch(() => undefined);
      return;
    }
    player.pause();
    player.currentTime = 0;
  }, [active, muted]);

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
            "wj-video-rail-clip" + (ready && active ? " is-ready" : "")
          }
          src={src}
          title={item.label || "Video"}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          tabIndex={-1}
        />
      ) : null}
    </>
  );
}

function VideoStackCard({
  item,
  offset,
  total,
  layout,
  playing,
  muted,
  onOpen,
  onFocusCard,
  onHover,
}: {
  item: GalleryMainItem;
  offset: number;
  total: number;
  layout: "strip" | "coverflow";
  playing: boolean;
  muted: boolean;
  onOpen: () => void;
  onFocusCard: () => void;
  onHover?: () => void;
}) {
  const isStrip = layout === "strip";
  const style = isStrip ? undefined : coverflowStyle(offset, total);
  const isFront = isStrip ? playing : offset === 0;
  const abs = Math.abs(offset);
  const visible = isStrip || abs <= 1;
  const mounted = isStrip || abs <= 2;

  return (
    <article
      className={
        "wj-video-rail-card" + (isFront ? " is-front" : " is-back")
      }
      role="listitem"
      data-cover-offset={isStrip ? undefined : offset}
      data-item-id={item.id}
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
              active={isFront}
              mounted={mounted}
              muted={muted}
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
