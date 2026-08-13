"use client";

import { useCallback, useRef } from "react";

type Axis = "h" | "v";

type Options = {
  enabled: boolean;
  /** Vuốt sang trái → ảnh sau. */
  onSwipeLeft: () => void;
  /** Vuốt sang phải → ảnh trước. */
  onSwipeRight: () => void;
  thresholdPx?: number;
  lockPx?: number;
};

/**
 * Vuốt ngang trên touch/pen. Vuốt dọc để trình duyệt cuộn — không cướp.
 * Bỏ qua click nút/link bên trong.
 */
export function useHorizontalSwipe({
  enabled,
  onSwipeLeft,
  onSwipeRight,
  thresholdPx = 48,
  lockPx = 12,
}: Options) {
  const startRef = useRef<{
    id: number;
    x: number;
    y: number;
    axis: Axis | null;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if ((e.target as Element | null)?.closest?.("button, a")) return;
      startRef.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        axis: null,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startRef.current;
      if (!start || start.id !== e.pointerId || start.axis) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < lockPx && Math.abs(dy) < lockPx) return;
      start.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    },
    [lockPx],
  );

  const finish = useCallback(
    (e: React.PointerEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start || start.id !== e.pointerId || start.axis !== "h") return;
      const dx = e.clientX - start.x;
      if (Math.abs(dx) < thresholdPx) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
    [onSwipeLeft, onSwipeRight, thresholdPx],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
  };
}
