"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { StudioTabId } from "@/lib/to-chuc/studio-page-config";
import {
  parseStudioRouteFromPathname,
  STUDIO_DEFAULT_TAB,
  studioTabPath,
  type StudioPathState,
} from "@/lib/to-chuc/studio-routes";

const DEFAULT_STATE: StudioPathState = {
  tab: STUDIO_DEFAULT_TAB,
  jobId: null,
  baiDangId: null,
  suKienId: null,
};

/** Tab studio — `pushState` client; deep link bài đăng / tuyển dụng / sự kiện giữ pathname. */
export function useStudioTabNav(orgSlug: string) {
  const pathname = usePathname();
  const pathState = useMemo(
    () => parseStudioRouteFromPathname(pathname ?? "") ?? DEFAULT_STATE,
    [pathname],
  );
  const [route, setRoute] = useState<StudioPathState>(pathState);

  useEffect(() => {
    setRoute(pathState);
  }, [pathState]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(
        parseStudioRouteFromPathname(window.location.pathname) ?? DEFAULT_STATE,
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectTab = useCallback(
    (next: StudioTabId) => {
      setRoute((current) => {
        if (
          current.tab === next &&
          !current.jobId &&
          !current.baiDangId &&
          !current.suKienId
        ) {
          return current;
        }
        window.history.pushState(null, "", studioTabPath(orgSlug, next));
        return { tab: next, jobId: null, baiDangId: null, suKienId: null };
      });
    },
    [orgSlug],
  );

  return {
    tab: route.tab,
    jobId: route.jobId,
    baiDangId: route.baiDangId,
    suKienId: route.suKienId,
    selectTab,
  };
}
