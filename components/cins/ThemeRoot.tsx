"use client";

import { useLayoutEffect, useRef } from "react";

import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  isForceLightThemeActive,
  readThemeMode,
  syncThemeFromStorage,
  watchSystemTheme,
} from "@/lib/theme/theme-mode";

/**
 * Neo theme phía client — chạy trong root layout.
 *
 * Script no-flash trong <head> (app/layout.tsx) đã áp data-theme trước paint;
 * component này:
 * 1. Sync lại sau hydrate / soft-nav (phòng attribute bị lệch).
 * 2. Theo dõi prefers-color-scheme khi mode = "system" (không phụ thuộc modal cài đặt).
 * 3. Phản ứng khi tab khác đổi localStorage hoặc setThemeMode phát event.
 */
export function ThemeRoot() {
  const unwatchRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const bindSystemWatch = () => {
      unwatchRef.current?.();
      unwatchRef.current = watchSystemTheme(readThemeMode(), (resolved) => {
        if (isForceLightThemeActive()) return;
        applyResolvedTheme(resolved);
      });
    };

    syncThemeFromStorage();
    bindSystemWatch();

    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      syncThemeFromStorage();
      bindSystemWatch();
    };

    const onCustom = () => {
      syncThemeFromStorage();
      bindSystemWatch();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, onCustom);

    return () => {
      unwatchRef.current?.();
      unwatchRef.current = null;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, onCustom);
    };
  }, []);

  return null;
}
