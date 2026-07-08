"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CoSoTabId } from "@/lib/to-chuc/co-so-page-cau-hinh";
import {
  CO_SO_DEFAULT_TAB,
  coSoTabPath,
  parseCoSoRouteFromPathname,
  type CoSoPathState,
} from "@/lib/to-chuc/co-so-routes";

const DEFAULT_STATE: CoSoPathState = {
  tab: CO_SO_DEFAULT_TAB,
  khoaSlug: null,
  jobId: null,
  baiDangId: null,
};

/** Tab cơ sở đào tạo — `pushState` cho tab top-level; deep link giữ pathname. */
export function useCoSoTabNav(orgSlug: string) {
  const pathname = usePathname();
  const pathState = useMemo(
    () => parseCoSoRouteFromPathname(pathname ?? "") ?? DEFAULT_STATE,
    [pathname],
  );
  const [route, setRoute] = useState<CoSoPathState>(pathState);

  useEffect(() => {
    setRoute(pathState);
  }, [pathState]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseCoSoRouteFromPathname(window.location.pathname) ?? DEFAULT_STATE);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectTab = useCallback(
    (next: CoSoTabId) => {
      setRoute((current) => {
        if (
          current.tab === next &&
          !current.khoaSlug &&
          !current.jobId &&
          !current.baiDangId
        ) {
          return current;
        }
        window.history.pushState(null, "", coSoTabPath(orgSlug, next));
        return { tab: next, khoaSlug: null, jobId: null, baiDangId: null };
      });
    },
    [orgSlug],
  );

  return {
    tab: route.tab,
    khoaSlug: route.khoaSlug,
    jobId: route.jobId,
    baiDangId: route.baiDangId,
    selectTab,
  };
}
