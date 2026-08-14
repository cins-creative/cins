"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MOBILE_MQ = "(max-width: 960px)";

/**
 * Sticky shop chrome: chỉ `transform` follow topbar khi đã dính.
 * Animate `top` lệch nhịp với topbar (hở khe / giật).
 */
export function JourneyShopSectionHead({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

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
  }, []);

  return (
    <div ref={ref} className="j-shop-sf-section-head">
      {children}
    </div>
  );
}
