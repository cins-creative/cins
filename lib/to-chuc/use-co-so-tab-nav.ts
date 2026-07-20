"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CoSoTabId } from "@/lib/to-chuc/co-so-page-cau-hinh";
import {
  CO_SO_DEFAULT_TAB,
  coSoPathFromState,
  coSoTabPath,
  parseCoSoRouteFromPathname,
  type CoSoPathState,
} from "@/lib/to-chuc/co-so-routes";

const DEFAULT_STATE: CoSoPathState = {
  tab: CO_SO_DEFAULT_TAB,
  khoaSlug: null,
  jobId: null,
  baiDangId: null,
  suKienId: null,
};

type NavigateMode = "push" | "replace";

/**
 * Tab / deep-link cơ sở đào tạo.
 * Dùng `history.pushState` / `replaceState` trong shell — tránh soft-nav Next
 * vào `[tab]` ↔ `khoa-hoc/[khoaSlug]` (RSC 404 lần đầu, F5 mới vào được).
 */
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

  const navigate = useCallback(
    (next: CoSoPathState, mode: NavigateMode = "push") => {
      const href = coSoPathFromState(orgSlug, next);
      setRoute(next);
      if (mode === "replace") {
        window.history.replaceState(null, "", href);
      } else {
        window.history.pushState(null, "", href);
      }
    },
    [orgSlug],
  );

  const selectTab = useCallback(
    (next: CoSoTabId) => {
      setRoute((current) => {
        if (
          current.tab === next &&
          !current.khoaSlug &&
          !current.jobId &&
          !current.baiDangId &&
          !current.suKienId
        ) {
          return current;
        }
        window.history.pushState(null, "", coSoTabPath(orgSlug, next));
        return {
          tab: next,
          khoaSlug: null,
          jobId: null,
          baiDangId: null,
          suKienId: null,
        };
      });
    },
    [orgSlug],
  );

  const openKhoa = useCallback(
    (khoaSlug: string, mode: NavigateMode = "push") => {
      navigate(
        {
          tab: "khoa-hoc",
          khoaSlug,
          jobId: null,
          baiDangId: null,
          suKienId: null,
        },
        mode,
      );
    },
    [navigate],
  );

  const closeKhoa = useCallback(
    (mode: NavigateMode = "push") => {
      navigate(
        {
          tab: "khoa-hoc",
          khoaSlug: null,
          jobId: null,
          baiDangId: null,
          suKienId: null,
        },
        mode,
      );
    },
    [navigate],
  );

  return {
    tab: route.tab,
    khoaSlug: route.khoaSlug,
    jobId: route.jobId,
    baiDangId: route.baiDangId,
    suKienId: route.suKienId,
    selectTab,
    openKhoa,
    closeKhoa,
  };
}
