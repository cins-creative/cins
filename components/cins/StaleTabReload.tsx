"use client";

import { useEffect, useRef } from "react";

/** Tab nền liên tục ≥ ngưỡng rồi quay lại → hard reload (kiểu Facebook). */
export const STALE_TAB_MS = 90 * 60 * 1000;
/** Chống vòng reload nếu trang lỗi ngay sau F5. */
const RELOAD_COOLDOWN_MS = 60_000;
const RELOAD_AT_KEY = "cins-stale-reload-at";

function recentlyReloaded(): boolean {
  try {
    const raw = sessionStorage.getItem(RELOAD_AT_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markReload(): void {
  try {
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

function hasBusyGuard(): boolean {
  if (typeof document === "undefined") return true;
  if (document.querySelector("[data-cins-call-active]")) return true;
  if (document.querySelector("[data-cins-compose-dirty]")) return true;

  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;

  if (el.isContentEditable && (el.textContent?.trim().length ?? 0) > 0) {
    return true;
  }
  if (el instanceof HTMLTextAreaElement && el.value.trim().length > 0) {
    return true;
  }
  if (el instanceof HTMLInputElement) {
    const type = (el.type || "text").toLowerCase();
    if (
      (type === "text" ||
        type === "search" ||
        type === "email" ||
        type === "url" ||
        type === "tel" ||
        type === "password" ||
        type === "number" ||
        type === "") &&
      el.value.trim().length > 0
    ) {
      return true;
    }
  }
  if (el instanceof HTMLSelectElement && el.value) return true;

  return false;
}

/**
 * Facebook-style: tab nền lâu → reload sạch khi quay lại.
 * Idle ngắn: L35b realtime lo; idle dài: dọn heap/DOM/socket.
 * @see docs/PLAN_tab_stale_refresh.md
 */
export function StaleTabReload() {
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;

      const elapsed = Date.now() - hiddenAt;
      if (elapsed < STALE_TAB_MS) return;
      if (recentlyReloaded()) return;
      if (hasBusyGuard()) return;

      markReload();
      window.location.reload();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return null;
}
