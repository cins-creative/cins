"use client";

import { useEffect, type RefObject } from "react";

const MOBILE_MQ = "(max-width: 960px)";

/**
 * Đánh `.is-chrome-stuck` khi sticky chrome đã chạm mép dưới topbar.
 * Mobile: chỉ lúc đó mới được `transform` follow topbar ẩn — tránh kéo
 * thanh lên khi còn giữa trang (dưới hero / profile).
 */
export function useChromeStuck(ref: RefObject<HTMLElement | null>) {
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
      const navH = document.getElementById("app-topbar")?.offsetHeight ?? 64;
      el.classList.toggle(
        "is-chrome-stuck",
        el.getBoundingClientRect().top <= navH + 2,
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
