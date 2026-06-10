"use client";

import { useLayoutEffect, useState } from "react";

export const TOPBAR_PAGE_SLOT_ID = "app-topbar-page-slot";

/**
 * Portal target trong `#app-topbar-page-slot`.
 * Topbar là RSC async — slot có thể chưa có DOM khi client component mount lần đầu.
 */
export function useTopbarPageSlot(
  slotId: string = TOPBAR_PAGE_SLOT_ID,
): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const resolve = () => document.getElementById(slotId);

    const found = resolve();
    if (found) {
      setSlot(found);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = resolve();
      if (el) {
        setSlot(el);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const retry = window.setInterval(() => {
      const el = resolve();
      if (el) {
        setSlot(el);
        observer.disconnect();
        window.clearInterval(retry);
      }
    }, 50);

    const stop = window.setTimeout(() => {
      window.clearInterval(retry);
      observer.disconnect();
    }, 8000);

    return () => {
      observer.disconnect();
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, [slotId]);

  return slot;
}
