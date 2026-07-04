"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  parseTruongRouteFromPathname,
  TRUONG_DEFAULT_TAB,
  truongTabPath,
  type TruongTabId,
} from "@/lib/truong/truong-routes";

/** Tab trường ĐH — `pushState` client, không remount layout. */
export function useTruongTabNav(orgSlug: string) {
  const pathname = usePathname();
  const pathTab = useMemo(
    () => parseTruongRouteFromPathname(pathname ?? "") ?? TRUONG_DEFAULT_TAB,
    [pathname],
  );
  const [tab, setTab] = useState<TruongTabId>(pathTab);

  useEffect(() => {
    setTab(pathTab);
  }, [pathTab]);

  useEffect(() => {
    const onPopState = () => {
      setTab(
        parseTruongRouteFromPathname(window.location.pathname) ??
          TRUONG_DEFAULT_TAB,
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectTab = useCallback(
    (next: TruongTabId) => {
      setTab((current) => {
        if (current === next) return current;
        window.history.pushState(null, "", truongTabPath(orgSlug, next));
        return next;
      });
    },
    [orgSlug],
  );

  return { tab, selectTab };
}
