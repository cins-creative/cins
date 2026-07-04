"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { StudioTabId } from "@/lib/to-chuc/studio-page-config";
import {
  parseStudioTabFromPathname,
  STUDIO_DEFAULT_TAB,
  studioTabPath,
} from "@/lib/to-chuc/studio-routes";

/** Tab studio — `pushState` client. */
export function useStudioTabNav(orgSlug: string) {
  const pathname = usePathname();
  const pathTab = useMemo(
    () => parseStudioTabFromPathname(pathname ?? ""),
    [pathname],
  );
  const [tab, setTab] = useState<StudioTabId>(pathTab);

  useEffect(() => {
    setTab(pathTab);
  }, [pathTab]);

  useEffect(() => {
    const onPopState = () => {
      setTab(parseStudioTabFromPathname(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectTab = useCallback(
    (next: StudioTabId) => {
      setTab((current) => {
        if (current === next) return current;
        window.history.pushState(null, "", studioTabPath(orgSlug, next));
        return next;
      });
    },
    [orgSlug],
  );

  return { tab, selectTab };
}
