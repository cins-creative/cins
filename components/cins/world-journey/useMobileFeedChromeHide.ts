"use client";

import { useEffect, type RefObject } from "react";

const MOBILE_MQ = "(max-width: 960px)";
const SHOW_AT_TOP_PX = 8;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Mobile: chrome bám ngón tay — kéo xuống ẩn dần, kéo lên hiện dần, không delay.
 * Chỉ `transform` (không co layout) để tránh giật scrollY.
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
    };

    if (!enabled) {
      clear();
      return;
    }

    const mq = window.matchMedia(MOBILE_MQ);
    let lastY = Math.max(0, window.scrollY);
    let offset = 0;
    let raf = 0;

    const paint = () => {
      const header = headerEl();
      const topH = topbar?.offsetHeight ?? 64;
      const headH = header?.offsetHeight ?? 49;
      const max = topH + headH;
      const topShift = clamp(offset, 0, topH);
      if (topbar) {
        topbar.style.transform = topShift
          ? `translate3d(0, ${-topShift}px, 0)`
          : "";
        topbar.style.pointerEvents = offset >= topH ? "none" : "";
      }
      if (header) {
        header.style.transform = offset
          ? `translate3d(0, ${-offset}px, 0)`
          : "";
        header.style.pointerEvents = offset >= max - 1 ? "none" : "";
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
      const topH = topbar?.offsetHeight ?? 64;
      const headH = headerEl()?.offsetHeight ?? 49;
      const max = topH + headH;
      if (y <= SHOW_AT_TOP_PX) {
        offset = 0;
      } else if (dy > 0) {
        // Kéo xuống: topbar luôn ẩn hết (không để hở một phần).
        offset = clamp(Math.max(offset + dy, topH), 0, max);
      } else {
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

    syncFollowClass(true);
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onMq);
      if (raf) window.cancelAnimationFrame(raf);
      clear();
    };
  }, [enabled, rootRef]);
}
