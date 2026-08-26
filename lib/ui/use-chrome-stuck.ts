"use client";

import { useEffect, useRef, type RefObject } from "react";

const MOBILE_MQ = "(max-width: 960px)";

/**
 * Đánh `.is-chrome-stuck` khi sticky chrome đã chạm mép trên viewport.
 * Mobile: topbar nằm đáy — không trừ chiều cao nav khi tính stuck.
 */
export function useChromeStuck(
  ref: RefObject<HTMLElement | null>,
  extraInsetPx?: () => number,
) {
  const extraRef = useRef(extraInsetPx);
  extraRef.current = extraInsetPx;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia(MOBILE_MQ);
    let raf = 0;

    const sync = () => {
      raf = 0;
      if (!mq.matches) {
        el.classList.remove("is-chrome-stuck");
        return;
      }
      /* Mobile: app topbar dính đáy — chrome trang dính mép trên viewport. */
      const navH = mq.matches
        ? 0
        : (document.getElementById("app-topbar")?.offsetHeight ?? 64);
      const extra = extraRef.current?.() ?? 0;
      el.classList.toggle(
        "is-chrome-stuck",
        el.getBoundingClientRect().top <= navH + extra + 2,
      );
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", sync);
      if (raf) window.cancelAnimationFrame(raf);
      el.classList.remove("is-chrome-stuck");
    };
  }, [ref]);
}
