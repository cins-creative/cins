"use client";

import { useEffect, useState } from "react";

import {
  CO_SO_MOBILE_SHELL_MQ,
  type CoSoMobileShellTab,
} from "@/lib/to-chuc/co-so-mobile-shell";

export function useCoSoMobileShell(defaultTab: CoSoMobileShellTab = "content") {
  const [isMobileShell, setIsMobileShell] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(CO_SO_MOBILE_SHELL_MQ).matches;
  });
  const [mobileTab, setMobileTab] = useState<CoSoMobileShellTab>(defaultTab);

  useEffect(() => {
    const mq = window.matchMedia(CO_SO_MOBILE_SHELL_MQ);
    const sync = () => setIsMobileShell(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return { isMobileShell, mobileTab, setMobileTab };
}
