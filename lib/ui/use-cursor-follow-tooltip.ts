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
};

type PinMode = "freeze" | "anchor" | "interactive";

export function useCursorFollowTooltip({ width, estHeight }: Options) {
  const cursorFollowRef = useRef(false);
  const pinnedRef = useRef(false);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
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
    [pinTip, resolveSize],
  );

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      mouseRef.current = { x: clientX, y: clientY };
      if (pinnedRef.current) return;
      if (cursorFollowRef.current && tipPos) {
        setTipPos(computeCursorTooltipPosition(clientX, clientY, tipSize));
      }
    },
    [tipPos, tipSize],
  );

  const clearTip = useCallback(() => {
    pinnedRef.current = false;
    setTipPos(null);
  }, []);

  useEffect(() => {
    if (!tipPos || !cursorFollowRef.current || pinnedRef.current) return;
    const onMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
      setTipPos(
        computeCursorTooltipPosition(event.clientX, event.clientY, tipSize),
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [tipPos, tipSize]);

  return {
    tipPos,
    placeTip,
    pinTip,
    onPointerMove,
    clearTip,
    cursorFollow: () => cursorFollowRef.current && !pinnedRef.current,
  };
}
