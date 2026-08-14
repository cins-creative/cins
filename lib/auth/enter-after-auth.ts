"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { normalizeOAuthReturnPath } from "@/lib/auth/oauth-return-path";

const AUTHED_HOME_SEL = "[data-cins-authed-home]";
const GUEST_HOME_SEL = '.cins-shell--guest-home[data-screen-label="Trang-chu"]';
const POLL_MS = 50;
const WATCH_MS = 8000;

type OverlayListener = (show: boolean) => void;

const overlayListeners = new Set<OverlayListener>();
let overlayVisible = false;
let pollId: number | null = null;
let watchId: number | null = null;
let hardNavStarted = false;

export function subscribeAuthEnterOverlay(listener: OverlayListener): () => void {
  overlayListeners.add(listener);
  listener(overlayVisible);
  return () => {
    overlayListeners.delete(listener);
  };
}

function setAuthEnterOverlay(show: boolean): void {
  if (overlayVisible === show) return;
  overlayVisible = show;
  overlayListeners.forEach((listener) => listener(show));
}

export function isAppHomePath(path: string): boolean {
  try {
    const url = new URL(path, "http://cins.local");
    return url.pathname === "/";
  } catch {
    return path === "/" || path.startsWith("/?");
  }
}

export function sanitizeAuthRedirect(path: string | null | undefined): string {
  return normalizeOAuthReturnPath(path) ?? "/";
}

function stopWatch(): void {
  if (pollId != null) {
    window.clearInterval(pollId);
    pollId = null;
  }
  if (watchId != null) {
    window.clearTimeout(watchId);
    watchId = null;
  }
}

function authedHomeLanded(): boolean {
  return Boolean(document.querySelector(AUTHED_HOME_SEL));
}

function guestHomeLanded(): boolean {
  return Boolean(document.querySelector(GUEST_HOME_SEL));
}

function hardNavigateOnce(path: string): void {
  if (hardNavStarted) return;
  hardNavStarted = true;
  stopWatch();
  window.location.assign(path);
}

function startWatch(path: string): void {
  stopWatch();
  hardNavStarted = false;

  const home = isAppHomePath(path);

  pollId = window.setInterval(() => {
    if (authedHomeLanded()) {
      stopWatch();
      setAuthEnterOverlay(false);
      return;
    }
    if (home && guestHomeLanded()) {
      hardNavigateOnce(path);
      return;
    }
    if (!home && window.location.pathname !== "/login") {
      stopWatch();
      setAuthEnterOverlay(false);
    }
  }, POLL_MS);

  watchId = window.setTimeout(() => {
    if (authedHomeLanded()) {
      setAuthEnterOverlay(false);
      stopWatch();
      return;
    }
    if (home || window.location.pathname === "/login") {
      hardNavigateOnce(path);
      return;
    }
    setAuthEnterOverlay(false);
    stopWatch();
  }, WATCH_MS);
}

type AppRouterLike = {
  replace: (href: string) => void;
};

/**
 * Sau khi cookie phiên đã nằm trên response: sơn khung trang chủ (nếu về `/`)
 * rồi soft-nav. Fallback hard-nav một lần nếu RSC vẫn ra guest home.
 */
export function enterAfterAuth(
  router: AppRouterLike,
  redirect: string | null | undefined,
): void {
  const path = sanitizeAuthRedirect(redirect);
  if (isAppHomePath(path)) {
    setAuthEnterOverlay(true);
  } else {
    setAuthEnterOverlay(false);
  }
  startWatch(path);
  router.replace(path);
}

export function useEnterAfterAuth(): (redirect?: string | null) => void {
  const router = useRouter();
  return useCallback(
    (redirect?: string | null) => {
      enterAfterAuth(router, redirect);
    },
    [router],
  );
}
