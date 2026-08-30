"use client";

import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

export type WjOpenAside = "left" | "right" | null;

/** Mép bắt đầu vuốt mở (px). Tap mép không mở — phải kéo ngang. */
const EDGE_PX = 44;
/** |dx| tối thiểu trước khi khóa hướng ngang. */
const LOCK_PX = 14;
/** Tỉ lệ bề ngang màn hình để snap mở / đóng. */
const SNAP = 0.32;
/** Vận tốc flick (px/ms). */
const FLICK = 0.55;
const DRAWER_MS = 320;
const IGNORE =
  ".shop-kiosk-ticker-hit, .shop-kiosk-ticker, .shop-kiosk-ticker-track, .shop-kiosk-ticker-label, .wj-feed-promo-rail-track, .j-reaction-wrap";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function canOpenLeft() {
  return window.matchMedia("(max-width: 991.98px)").matches;
}

function canOpenRight() {
  return window.matchMedia("(max-width: 1199.98px)").matches;
}

function txFor(side: "left" | "right", progress: number): string {
  const p = clamp(progress, 0, 1);
  return side === "left" ? `${(-1 + p) * 100}%` : `${(1 - p) * 100}%`;
}

function viewAllowsDrawer(surface: string) {
  return surface !== "gallery" && surface !== "video";
}

/**
 * Mobile/tablet: vuốt từ mép trái/phải kéo sidebar theo ngón.
 * Drawer đang mở: vuốt ngược hướng để kéo đóng. Không dùng tap mép / nút X.
 */
export function useWorldJourneyAsideSwipe({
  rootRef,
  openAsideRef,
  surfaceViewRef,
  setOpenAside,
}: {
  rootRef: RefObject<HTMLElement | null>;
  openAsideRef: RefObject<WjOpenAside>;
  surfaceViewRef: RefObject<string>;
  setOpenAside: Dispatch<SetStateAction<WjOpenAside>>;
}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    type Drag = {
      side: "left" | "right";
      startX: number;
      startY: number;
      startProgress: number;
      lastX: number;
      lastT: number;
      vx: number;
      locked: boolean;
    };

    let drag: Drag | null = null;
    let suppressClick = false;
    let snapTimer = 0;
    let moveBound = false;

    const panel = (side: "left" | "right") =>
      root.querySelector<HTMLElement>(`#wj-aside-${side}`);

    const clearInline = () => {
      root.style.removeProperty("--wj-aside-backdrop-o");
      panel("left")?.style.removeProperty("--wj-aside-tx");
      panel("right")?.style.removeProperty("--wj-aside-tx");
    };

    const paint = (side: "left" | "right", progress: number) => {
      const el = panel(side);
      if (!el) return;
      el.style.setProperty("--wj-aside-tx", txFor(side, progress));
      root.setAttribute("data-dragging-aside", side);
      root.style.setProperty("--wj-aside-backdrop-o", String(progress * 0.45));
    };

    const finish = (side: "left" | "right", open: boolean) => {
      const el = panel(side);
      const target = txFor(side, open ? 1 : 0);
      root.removeAttribute("data-dragging-aside");
      setOpenAside(open ? side : null);
      window.requestAnimationFrame(() => {
        el?.style.setProperty("--wj-aside-tx", target);
      });
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        clearInline();
        snapTimer = 0;
      }, DRAWER_MS);
    };

    const unbindMove = () => {
      if (!moveBound) return;
      moveBound = false;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };

    const bindMove = () => {
      if (moveBound) return;
      moveBound = true;
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd, { passive: true });
      window.addEventListener("touchcancel", onCancel, { passive: true });
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        drag = null;
        unbindMove();
        return;
      }
      if (document.documentElement.hasAttribute("data-cins-reaction-picking")) {
        drag = null;
        return;
      }
      const raw = e.target;
      const el =
        raw instanceof Element
          ? raw
          : raw instanceof Node
            ? raw.parentElement
            : null;
      if (el?.closest(IGNORE)) {
        drag = null;
        return;
      }
      const t = e.touches[0];
      const open = openAsideRef.current;
      const now = performance.now();
      if (open) {
        drag = {
          side: open,
          startX: t.clientX,
          startY: t.clientY,
          startProgress: 1,
          lastX: t.clientX,
          lastT: now,
          vx: 0,
          locked: false,
        };
        bindMove();
        return;
      }
      if (!viewAllowsDrawer(surfaceViewRef.current)) {
        drag = null;
        return;
      }
      const w = window.innerWidth;
      const x = t.clientX;
      if (x <= EDGE_PX && canOpenLeft()) {
        drag = {
          side: "left",
          startX: t.clientX,
          startY: t.clientY,
          startProgress: 0,
          lastX: t.clientX,
          lastT: now,
          vx: 0,
          locked: false,
        };
        bindMove();
        return;
      }
      if (x >= w - EDGE_PX && canOpenRight()) {
        drag = {
          side: "right",
          startX: t.clientX,
          startY: t.clientY,
          startProgress: 0,
          lastX: t.clientX,
          lastT: now,
          vx: 0,
          locked: false,
        };
        bindMove();
        return;
      }
      drag = null;
    };

    const onMove = (e: TouchEvent) => {
      if (!drag || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - drag.startX;
      const dy = t.clientY - drag.startY;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT);
      drag.vx = (t.clientX - drag.lastX) / dt;
      drag.lastX = t.clientX;
      drag.lastT = now;

      if (!drag.locked) {
        if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          drag = null;
          unbindMove();
          return;
        }
        if (Math.abs(dx) < LOCK_PX || Math.abs(dx) < Math.abs(dy) * 1.15) {
          return;
        }
        const opening = drag.startProgress < 0.5;
        if (opening) {
          if (drag.side === "left" && dx < 0) {
            drag = null;
            unbindMove();
            return;
          }
          if (drag.side === "right" && dx > 0) {
            drag = null;
            unbindMove();
            return;
          }
        } else if (drag.side === "left" && dx > 0) {
          drag = null;
          unbindMove();
          return;
        } else if (drag.side === "right" && dx < 0) {
          drag = null;
          unbindMove();
          return;
        }
        drag.locked = true;
      }

      if (e.cancelable) e.preventDefault();
      const w = Math.max(1, window.innerWidth);
      const progress =
        drag.side === "left"
          ? drag.startProgress + dx / w
          : drag.startProgress - dx / w;
      paint(drag.side, clamp(progress, 0, 1));
    };

    const onEnd = () => {
      unbindMove();
      if (!drag) return;
      const cur = drag;
      drag = null;
      if (!cur.locked) return;
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 400);

      const w = Math.max(1, window.innerWidth);
      const dx = cur.lastX - cur.startX;
      const progress =
        cur.side === "left"
          ? clamp(cur.startProgress + dx / w, 0, 1)
          : clamp(cur.startProgress - dx / w, 0, 1);
      const flickOpen = cur.side === "left" ? cur.vx > FLICK : cur.vx < -FLICK;
      const flickClose = cur.side === "left" ? cur.vx < -FLICK : cur.vx > FLICK;
      const open = flickOpen ? true : flickClose ? false : progress >= SNAP;
      finish(cur.side, open);
    };

    const onCancel = () => {
      unbindMove();
      if (!drag) return;
      const side = drag.side;
      const locked = drag.locked;
      drag = null;
      if (!locked) return;
      finish(side, openAsideRef.current === side);
    };

    const onClickCapture = (e: Event) => {
      if (!suppressClick) return;
      e.preventDefault();
      e.stopPropagation();
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("click", onClickCapture, true);
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("click", onClickCapture, true);
      unbindMove();
      window.clearTimeout(snapTimer);
      root.removeAttribute("data-dragging-aside");
      clearInline();
    };
  }, [rootRef, openAsideRef, surfaceViewRef, setOpenAside]);
}
