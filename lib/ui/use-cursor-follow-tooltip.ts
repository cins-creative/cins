"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  computeAnchoredTooltipPosition,
  computeCursorTooltipPosition,
  computeInteractiveTooltipPosition,
  prefersCursorFollowTooltips,
} from "@/lib/ui/cursor-tooltip-position";

type Options = {
  width: number;
  estHeight: number;
  /** Thời gian chờ trước khi đóng khi rời anchor (ms) — cho tooltip có CTA. */
  closeDelayMs?: number;
};

type PinMode = "freeze" | "anchor" | "interactive";

export function useCursorFollowTooltip({
  width,
  estHeight,
  closeDelayMs = 0,
}: Options) {
  const cursorFollowRef = useRef(false);
  const pinnedRef = useRef(false);
  const anchorHoverRef = useRef(false);
  const tipHoverRef = useRef(false);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
    cursorFollowRef.current = prefersCursorFollowTooltips();
  }, []);

  const tipSize = { width, height: estHeight };

  const resolveSize = useCallback(
    (height?: number) => ({ width, height: height ?? estHeight }),
    [width, estHeight],
  );

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearTip = useCallback(() => {
    cancelScheduledClose();
    anchorHoverRef.current = false;
    tipHoverRef.current = false;
    pinnedRef.current = false;
    setTipPos(null);
  }, [cancelScheduledClose]);

  const scheduleClose = useCallback(
    (delay = closeDelayMs) => {
      cancelScheduledClose();
      closeTimerRef.current = setTimeout(() => {
        if (!anchorHoverRef.current && !tipHoverRef.current) {
          clearTip();
        }
      }, delay);
    },
    [cancelScheduledClose, clearTip, closeDelayMs],
  );

  const setAnchorHover = useCallback(
    (hovering: boolean) => {
      anchorHoverRef.current = hovering;
      if (hovering) {
        cancelScheduledClose();
        return;
      }
      if (tipHoverRef.current) return;
      if (closeDelayMs > 0) {
        scheduleClose(closeDelayMs);
        return;
      }
      clearTip();
    },
    [cancelScheduledClose, clearTip, closeDelayMs, scheduleClose],
  );

  const setTipHover = useCallback(
    (hovering: boolean) => {
      tipHoverRef.current = hovering;
      if (hovering) {
        cancelScheduledClose();
        return;
      }
      if (anchorHoverRef.current) return;
      scheduleClose(closeDelayMs > 0 ? closeDelayMs : 0);
    },
    [cancelScheduledClose, closeDelayMs, scheduleClose],
  );

  const pinTip = useCallback(
    (
      anchor: HTMLElement | null,
      opts?: { height?: number; mode?: PinMode },
    ) => {
      pinnedRef.current = true;
      const size = resolveSize(opts?.height);
      const mode = opts?.mode ?? (anchor ? "interactive" : "freeze");

      if (mode === "interactive" && anchor) {
        setTipPos(
          computeInteractiveTooltipPosition(anchor.getBoundingClientRect(), size),
        );
        return;
      }
      if (mode === "anchor" && anchor) {
        setTipPos(
          computeAnchoredTooltipPosition(anchor.getBoundingClientRect(), size),
        );
        return;
      }
      if (mouseRef.current) {
        setTipPos(
          computeCursorTooltipPosition(
            mouseRef.current.x,
            mouseRef.current.y,
            size,
          ),
        );
      }
    },
    [resolveSize],
  );

  const placeTip = useCallback(
    (
      anchor: HTMLElement | null,
      opts?: { height?: number; follow?: boolean },
    ) => {
      anchorHoverRef.current = true;
      cancelScheduledClose();
      if (opts?.follow) {
        pinnedRef.current = false;
      }
      if (pinnedRef.current) {
        pinTip(anchor, { height: opts?.height, mode: "interactive" });
        return;
      }
      const size = resolveSize(opts?.height);
      if (cursorFollowRef.current && mouseRef.current) {
        setTipPos(
          computeCursorTooltipPosition(
            mouseRef.current.x,
            mouseRef.current.y,
            size,
          ),
        );
        return;
      }
      if (anchor) {
        setTipPos(
          computeAnchoredTooltipPosition(anchor.getBoundingClientRect(), size),
        );
      }
    },
    [cancelScheduledClose, pinTip, resolveSize],
  );

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      mouseRef.current = { x: clientX, y: clientY };
      if (!anchorHoverRef.current || pinnedRef.current) return;
      if (cursorFollowRef.current && tipPos) {
        setTipPos(computeCursorTooltipPosition(clientX, clientY, tipSize));
      }
    },
    [tipPos, tipSize],
  );

  useEffect(() => {
    if (!tipPos || !cursorFollowRef.current || pinnedRef.current) return;
    const onMove = (event: MouseEvent) => {
      if (!anchorHoverRef.current) {
        if (!tipHoverRef.current) clearTip();
        return;
      }
      mouseRef.current = { x: event.clientX, y: event.clientY };
      setTipPos(
        computeCursorTooltipPosition(event.clientX, event.clientY, tipSize),
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [clearTip, tipPos, tipSize]);

  useEffect(() => {
    if (!tipPos) return;
    const dismiss = () => clearTip();
    window.addEventListener("scroll", dismiss, true);
    return () => window.removeEventListener("scroll", dismiss, true);
  }, [clearTip, tipPos]);

  useEffect(() => () => clearTip(), [clearTip]);

  return {
    tipPos,
    placeTip,
    pinTip,
    onPointerMove,
    clearTip,
    setAnchorHover,
    setTipHover,
    cancelScheduledClose,
    cursorFollow: () => cursorFollowRef.current && !pinnedRef.current,
  };
}
