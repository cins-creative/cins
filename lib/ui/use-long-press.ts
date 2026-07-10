"use client";

import { useCallback, useRef } from "react";

type Options = {
  onLongPress: () => void;
  onPress?: () => void;
  delayMs?: number;
  disabled?: boolean;
  moveThresholdPx?: number;
};

/** Tap ngắn → onPress; giữ ~480ms → onLongPress (hủy khi scroll/di chuyển ngón). */
export function useLongPress({
  onLongPress,
  onPress,
  delayMs = 480,
  disabled = false,
  moveThresholdPx = 10,
}: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (disabled) return;
      longPressFiredRef.current = false;
      const touch = event.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      clearTimer();
      timerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(12);
        }
        onLongPress();
      }, delayMs);
    },
    [clearTimer, delayMs, disabled, onLongPress],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const start = touchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;
      const dx = Math.abs(touch.clientX - start.x);
      const dy = Math.abs(touch.clientY - start.y);
      if (dx > moveThresholdPx || dy > moveThresholdPx) {
        clearTimer();
        touchStartRef.current = null;
      }
    },
    [clearTimer, moveThresholdPx],
  );

  const onTouchEnd = useCallback(() => {
    clearTimer();
    touchStartRef.current = null;
  }, [clearTimer]);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (longPressFiredRef.current) {
        event.preventDefault();
        event.stopPropagation();
        longPressFiredRef.current = false;
        return;
      }
      onPress?.();
    },
    [onPress],
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
    onClick,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  };
}
