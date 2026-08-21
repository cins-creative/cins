"use client";

import { useEffect, type RefObject } from "react";

const MOBILE_MQ = "(max-width: 960px)";
const SHOW_AT_TOP_PX = 8;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Mobile: chrome bám ngón tay — kéo xuống ẩn dần, kéo lên hiện dần.
 * Chỉ `transform` (không co layout / không nhảy full-hide) để tránh giật.
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
    };

    if (!enabled) {
      clear();
      return;
    }

    const mq = window.matchMedia(MOBILE_MQ);
    let lastY = Math.max(0, window.scrollY);
    let offset = 0;
    let raf = 0;
    let header = headerEl();
    let topH = topbar?.offsetHeight ?? 64;
    let headH = header?.offsetHeight ?? 49;

    const measure = () => {
      header = headerEl();
      topH = topbar?.offsetHeight ?? 64;
      headH = header?.offsetHeight ?? 49;
      if (root && topH > 0) {
        root.style.setProperty("--wj-sticky-top", `${topH}px`);
      }
    };

    const paint = () => {
      if (!header || !header.isConnected) header = headerEl();
      const max = topH + headH;
      const y = clamp(offset, 0, max);
      const topShift = clamp(y, 0, topH);
      if (topbar) {
        topbar.style.transform = `translate3d(0, ${-topShift}px, 0)`;
        topbar.style.pointerEvents = y >= topH ? "none" : "";
      }
      if (header) {
        header.style.transform = `translate3d(0, ${-y}px, 0)`;
        header.style.pointerEvents = y >= max - 1 ? "none" : "";
      }
    };

    const syncFollowClass = (on: boolean) => {
      topbar?.classList.toggle("wj-chrome-follow", on);
      headerEl()?.classList.toggle("wj-chrome-follow", on);
    };

    const tick = () => {
      raf = 0;
      if (!mq.matches) {
        offset = 0;
        lastY = Math.max(0, window.scrollY);
        paint();
        return;
      }
      const y = Math.max(0, window.scrollY);
      const dy = y - lastY;
      lastY = y;
      const max = topH + headH;
      if (y <= SHOW_AT_TOP_PX) {
        offset = 0;
      } else {
        /* 1:1 theo ngón — không snap topbar ẩn hết (gây giật khi dy đảo). */
        offset = clamp(offset + dy, 0, max);
      }
      paint();
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(tick);
    };

    const onMq = () => {
      if (!mq.matches) {
        offset = 0;
        paint();
      }
    };

    measure();
    syncFollowClass(true);
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", onMq);
      if (raf) window.cancelAnimationFrame(raf);
      clear();
    };
  }, [enabled, rootRef]);
}
