"use client";

import { useEffect } from "react";

import {
  HARD_NAV_ALLOW_SOFT_ATTR,
  shouldHardNavigate,
} from "@/lib/navigation/hard-nav";

/**
 * Ép hard navigation khi click `<a>` / Next `<Link>` đổi shell dễ gãy RSC soft-nav 404.
 * Capture phase — chạy trước handler của `next/link`.
 *
 * Opt-out: `data-allow-soft-nav` trên `<a>` hoặc tổ tiên.
 */
export function HardNavGuard() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.closest(`[${HARD_NAV_ALLOW_SOFT_ATTR}]`)) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;
      if (
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:") ||
        hrefAttr.startsWith("javascript:")
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const from = window.location.pathname;
      const to = url.pathname;
      if (!shouldHardNavigate(from, to)) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
