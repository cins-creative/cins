"use client";

import { useEffect, useState } from "react";

import { CO_SO_MOBILE_SHELL_MQ } from "@/lib/to-chuc/co-so-mobile-shell";

/** Mobile shell (≤991.98px) — gộp Thông tin + Nội dung; Thông báo qua FAB. */
export function useCoSoMobileShell() {
  const [isMobileShell, setIsMobileShell] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(CO_SO_MOBILE_SHELL_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(CO_SO_MOBILE_SHELL_MQ);
    const sync = () => setIsMobileShell(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return { isMobileShell };
}
