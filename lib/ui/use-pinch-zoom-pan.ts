"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const TAP_MAX_DIST = 14;

type Transform = { scale: number; x: number; y: number };

type Options = {
  /** Mở sẵn chế độ full-screen (ẩn chrome). Nút tắt đóng viewer, không thoát immersive. */
  lockedImmersive?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function touchPair(touches: TouchList): [Touch, Touch] | null {
  const a = touches.item(0);
  const b = touches.item(1);
  if (!a || !b) return null;
  return [a, b];
}

function pairDist(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function pairMid(a: Touch, b: Touch) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function applyContentTransform(el: HTMLElement | null, t: Transform) {
  if (!el) return;
  el.style.transform =
    t.scale === 1 && t.x === 0 && t.y === 0
      ? ""
      : `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`;
}

function zoomAround(
  t: Transform,
  origin: { x: number; y: number },
  nextScale: number,
  cx: number,
  cy: number,
): Transform {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  if (scale === MIN_SCALE) return { scale: MIN_SCALE, x: 0, y: 0 };
  const wx = (origin.x - cx - t.x) / t.scale;
  const wy = (origin.y - cy - t.y) / t.scale;
  return {
    scale,
    x: origin.x - cx - wx * scale,
    y: origin.y - cy - wy * scale,
  };
}

function clampPan(t: Transform, width: number, height: number): Transform {
  if (t.scale <= MIN_SCALE) return { scale: MIN_SCALE, x: 0, y: 0 };
  const maxX = (width * t.scale) / 2;
  const maxY = (height * t.scale) / 2;
  return {
    scale: t.scale,
    x: clamp(t.x, -maxX, maxX),
    y: clamp(t.y, -maxY, maxY),
  };
}

function isChromeTarget(target: EventTarget | null) {
  return Boolean((target as Element | null)?.closest?.("button, a"));
}

/**
 * Zoom + pan trong lightbox xem ảnh.
 * Mobile: tap vào ảnh → immersive; pinch zoom; 1 ngón pan khi đã phóng.
 * Desktop: lăn chuột zoom → immersive; kéo chuột khi đã phóng to.
 */
export function usePinchZoomPan(resetKey: unknown, options?: Options) {
  const lockedImmersive = options?.lockedImmersive === true;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const pinchRef = useRef<{
    dist: number;
    mid: { x: number; y: number };
    start: Transform;
  } | null>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    start: Transform;
  } | null>(null);
  const tapRef = useRef<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const immersiveRef = useRef(lockedImmersive);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isImmersive, setIsImmersive] = useState(lockedImmersive);
  const [gestureLock, setGestureLock] = useState(false);

  const enterImmersive = useCallback(() => {
    if (immersiveRef.current) return;
    immersiveRef.current = true;
    setIsImmersive(true);
  }, []);

  const exitImmersive = useCallback(() => {
    transformRef.current = { scale: 1, x: 0, y: 0 };
    pinchRef.current = null;
    dragRef.current = null;
    applyContentTransform(contentRef.current, transformRef.current);
    setIsZoomed(false);
    setGestureLock(false);
    if (lockedImmersive) return;
    immersiveRef.current = false;
    setIsImmersive(false);
  }, [lockedImmersive]);

  useEffect(() => {
    transformRef.current = { scale: 1, x: 0, y: 0 };
    pinchRef.current = null;
    dragRef.current = null;
    tapRef.current = null;
    applyContentTransform(contentRef.current, transformRef.current);
    setIsZoomed(false);
    setGestureLock(false);
  }, [resetKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const commit = (next: Transform) => {
      const rect = viewport.getBoundingClientRect();
      const clamped = clampPan(next, rect.width, rect.height);
      transformRef.current = clamped;
      applyContentTransform(contentRef.current, clamped);
      const zoomed = clamped.scale > 1.01;
      setIsZoomed((prev) => (prev === zoomed ? prev : zoomed));
    };

    const center = () => {
      const rect = viewport.getBoundingClientRect();
      return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const pair = touchPair(e.touches);
        if (!pair) return;
        dragRef.current = null;
        tapRef.current = null;
        pinchRef.current = {
          dist: Math.max(pairDist(pair[0], pair[1]), 1),
          mid: pairMid(pair[0], pair[1]),
          start: { ...transformRef.current },
        };
        enterImmersive();
        setGestureLock(true);
        return;
      }
      if (e.touches.length === 1 && transformRef.current.scale > 1.01) {
        const t = e.touches.item(0);
        if (!t) return;
        dragRef.current = {
          id: t.identifier,
          x: t.clientX,
          y: t.clientY,
          start: { ...transformRef.current },
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && pinchRef.current) {
        const pair = touchPair(e.touches);
        if (!pair) return;
        e.preventDefault();
        tapRef.current = null;
        const { cx, cy } = center();
        const dist = Math.max(pairDist(pair[0], pair[1]), 1);
        const mid = pairMid(pair[0], pair[1]);
        const pinch = pinchRef.current;
        const nextScale = pinch.start.scale * (dist / pinch.dist);
        const zoomed = zoomAround(pinch.start, pinch.mid, nextScale, cx, cy);
        commit({
          scale: zoomed.scale,
          x: zoomed.x + (mid.x - pinch.mid.x),
          y: zoomed.y + (mid.y - pinch.mid.y),
        });
        return;
      }
      const drag = dragRef.current;
      if (e.touches.length === 1 && drag) {
        const t = e.touches.item(0);
        if (!t || t.identifier !== drag.id) return;
        e.preventDefault();
        tapRef.current = null;
        commit({
          scale: drag.start.scale,
          x: drag.start.x + (t.clientX - drag.x),
          y: drag.start.y + (t.clientY - drag.y),
        });
      }
    };

    const endPinch = () => {
      pinchRef.current = null;
      if (transformRef.current.scale <= 1.01) {
        commit({ scale: 1, x: 0, y: 0 });
      }
      setGestureLock(false);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) endPinch();
      if (e.touches.length === 0) dragRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (isChromeTarget(e.target)) return;
      e.preventDefault();
      enterImmersive();
      const { cx, cy } = center();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
      commit(
        zoomAround(
          transformRef.current,
          { x: e.clientX, y: e.clientY },
          transformRef.current.scale * factor,
          cx,
          cy,
        ),
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isChromeTarget(e.target)) return;
      if (e.button !== 0) return;
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        tapRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        return;
      }
      if (transformRef.current.scale <= 1.01) return;
      dragRef.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        start: { ...transformRef.current },
      };
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const tap = tapRef.current;
      if (tap && tap.id === e.pointerId) {
        if (
          Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_MAX_DIST
        ) {
          tapRef.current = null;
        }
      }
      const drag = dragRef.current;
      if (!drag || drag.id !== e.pointerId) return;
      if (e.pointerType === "touch") return;
      e.preventDefault();
      commit({
        scale: drag.start.scale,
        x: drag.start.x + (e.clientX - drag.x),
        y: drag.start.y + (e.clientY - drag.y),
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragRef.current?.id === e.pointerId) dragRef.current = null;
      const tap = tapRef.current;
      tapRef.current = null;
      if (!tap || tap.id !== e.pointerId) return;
      if (isChromeTarget(e.target)) return;
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_MAX_DIST) {
        return;
      }
      enterImmersive();
    };

    const preventGesture = (e: Event) => e.preventDefault();

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd);
    viewport.addEventListener("touchcancel", onTouchEnd);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("gesturestart", preventGesture);
    viewport.addEventListener("gesturechange", preventGesture);

    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("gesturestart", preventGesture);
      viewport.removeEventListener("gesturechange", preventGesture);
    };
  }, [enterImmersive]);

  return {
    viewportRef,
    contentRef,
    isZoomed,
    isImmersive,
    gestureLock,
    exitImmersive,
  };
}
