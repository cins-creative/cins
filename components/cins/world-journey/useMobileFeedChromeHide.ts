"use client";

import { useEffect, type RefObject } from "react";

const MOBILE_MQ = "(max-width: 960px)";
const SHOW_AT_TOP_PX = 8;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function setTranslateY(el: HTMLElement | null, py: number) {
  if (!el) return;
  const next = `translate3d(0, ${py}px, 0)`;
  if (el.style.transform !== next) el.style.transform = next;
}

/**
 * Mobile: chrome bám ngón tay — kéo xuống ẩn dần, kéo lên hiện dần.
 * Chỉ `transform` trên compositor; touchmove để 60fps (scroll event trên mobile hay ~18fps).
 */
export function useMobileFeedChromeHide(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const root = rootRef.current;
    const topbar = document.getElementById("app-topbar");

    const headerEl = () =>
      root?.querySelector<HTMLElement>(".wj-feed-header") ?? null;

    const clear = () => {
      topbar?.classList.remove("wj-chrome-follow");
      headerEl()?.classList.remove("wj-chrome-follow");
      if (topbar) {
        topbar.style.transform = "";
        topbar.style.pointerEvents = "";
      }
      const header = headerEl();
      if (header) {
        header.style.transform = "";
        header.style.pointerEvents = "";
      }
      root?.style.removeProperty("--wj-sticky-top");
      root?.style.removeProperty("--wj-feed-header-h");
    };

    if (!enabled) {
      clear();
      return;
    }

    const mq = window.matchMedia(MOBILE_MQ);
    let lastY = Math.max(0, window.scrollY);
    let offset = 0;
    let raf = 0;
    let touching = false;
    let lastTouchY = 0;
    let header = headerEl();
    let topH = topbar?.offsetHeight ?? 64;
    let headH = header?.offsetHeight ?? 49;
    let peTop = "";
    let peHead = "";
    let paintedY = Number.NaN;

    const measure = () => {
      header = headerEl();
      topH = topbar?.offsetHeight ?? 64;
      headH = header?.offsetHeight ?? 49;
      if (root && topH > 0) {
        root.style.setProperty("--wj-sticky-top", `${topH}px`);
      }
      if (root && headH > 0) {
        root.style.setProperty("--wj-feed-header-h", `${headH}px`);
      }
    };

    const paint = () => {
      if (!header || !header.isConnected) header = headerEl();
      const max = topH + headH;
      const y = clamp(offset, 0, max);
      if (y === paintedY) return;
      paintedY = y;
      const topShift = clamp(y, 0, topH);
      setTranslateY(topbar, -topShift);
      setTranslateY(header, -y);
      const nextPeTop = y >= topH ? "none" : "";
      const nextPeHead = y >= max - 1 ? "none" : "";
      if (topbar && peTop !== nextPeTop) {
        peTop = nextPeTop;
        topbar.style.pointerEvents = nextPeTop;
      }
      if (header && peHead !== nextPeHead) {
        peHead = nextPeHead;
        header.style.pointerEvents = nextPeHead;
      }
    };

    const applyScrollY = (scrollY: number) => {
      const dy = scrollY - lastY;
      lastY = scrollY;
      const max = topH + headH;
      if (scrollY <= SHOW_AT_TOP_PX) {
        offset = 0;
      } else {
        offset = clamp(offset + dy, 0, max);
      }
    };

    const tick = () => {
      raf = 0;
      if (!mq.matches) {
        offset = 0;
        lastY = Math.max(0, window.scrollY);
        paintedY = Number.NaN;
        paint();
        return;
      }
      const scrollY = Math.max(0, window.scrollY);
      if (!touching) {
        applyScrollY(scrollY);
      } else {
        lastY = scrollY;
      }
      paint();
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      schedule();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!mq.matches || e.touches.length !== 1) return;
      touching = true;
      lastTouchY = e.touches[0].clientY;
      lastY = Math.max(0, window.scrollY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touching || !mq.matches || e.touches.length !== 1) return;
      const cy = e.touches[0].clientY;
      const dy = lastTouchY - cy;
      lastTouchY = cy;
      const scrollY = Math.max(0, window.scrollY);
      const max = topH + headH;
      if (scrollY <= SHOW_AT_TOP_PX) {
        offset = 0;
      } else {
        offset = clamp(offset + dy, 0, max);
      }
      paintedY = Number.NaN;
      schedule();
    };

    const onTouchEnd = () => {
      touching = false;
      lastY = Math.max(0, window.scrollY);
      schedule();
    };

    const onMq = () => {
      if (!mq.matches) {
        offset = 0;
        paintedY = Number.NaN;
        paint();
      }
    };

    measure();
    topbar?.classList.add("wj-chrome-follow");
    headerEl()?.classList.add("wj-chrome-follow");
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", onMq);
      if (raf) window.cancelAnimationFrame(raf);
      clear();
    };
  }, [enabled, rootRef]);
}
