"use client";

import { useEffect, type RefObject } from "react";

export const CHAT_SWIPE_MIN_DX = 56;
export const CHAT_SWIPE_MAX_DY = 48;
export const CHAT_SWIPE_MOBILE_MQ = "(max-width: 767.98px)";

const DEFAULT_IGNORE = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "[role='menu']",
  ".cins-chat-compose",
  ".cins-chat-compose-tools-panel",
  ".j-chat-mini-compose",
].join(", ");

export function isChatSwipeMobile(): boolean {
  return window.matchMedia(CHAT_SWIPE_MOBILE_MQ).matches;
}

export function classifyChatSwipe(
  dx: number,
  dy: number,
): "left" | "right" | null {
  if (Math.abs(dy) > CHAT_SWIPE_MAX_DY) return null;
  if (Math.abs(dx) < CHAT_SWIPE_MIN_DX) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.2) return null;
  return dx < 0 ? "left" : "right";
}

type Options = {
  enabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** LTR trên bubble = reply — convo không xử lý. */
  skipRightOnBubble?: boolean;
  ignoreSelector?: string;
};

/** Vuốt ngang trên khung tin (mobile): trái = expand, phải = đóng panel. */
export function useChatConvoSwipe(
  rootRef: RefObject<HTMLElement | null>,
  {
    enabled = true,
    onSwipeLeft,
    onSwipeRight,
    skipRightOnBubble = true,
    ignoreSelector = DEFAULT_IGNORE,
  }: Options,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;

    type Track = { x: number; y: number; onBubble: boolean };
    let track: Track | null = null;

    const onStart = (e: TouchEvent) => {
      if (!isChatSwipeMobile() || e.touches.length !== 1) {
        track = null;
        return;
      }
      const el = e.target;
      if (el instanceof Element && el.closest(ignoreSelector)) {
        track = null;
        return;
      }
      const t = e.touches[0];
      track = {
        x: t.clientX,
        y: t.clientY,
        onBubble:
          el instanceof Element &&
          Boolean(el.closest(".cins-chat-bubble-wrap")),
      };
    };

    const onEnd = (e: TouchEvent) => {
      if (!track || e.changedTouches.length !== 1) {
        track = null;
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - track.x;
      const dy = t.clientY - track.y;
      const onBubble = track.onBubble;
      track = null;
      if (!isChatSwipeMobile()) return;
      const dir = classifyChatSwipe(dx, dy);
      if (!dir) return;
      if (dir === "right") {
        if (skipRightOnBubble && onBubble) return;
        onSwipeRight?.();
        return;
      }
      onSwipeLeft?.();
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchend", onEnd);
    };
  }, [
    enabled,
    ignoreSelector,
    onSwipeLeft,
    onSwipeRight,
    rootRef,
    skipRightOnBubble,
  ]);
}
