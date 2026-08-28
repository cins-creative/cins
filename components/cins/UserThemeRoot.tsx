"use client";

import { useLayoutEffect } from "react";

import type { ProfileThemeSlice } from "@/lib/journey/profile-theme";
import {
  USER_THEME_CHANGE_EVENT,
  applyUserShellTheme,
  clearUserShellTheme,
} from "@/lib/journey/user-shell-theme";

/**
 * Hydrate accent + họa tiết giao_dien lên `.cins-shell`.
 * Trang chủ có thể đã SSR attrs — effect này đồng bộ / trang khác.
 */
export function UserThemeRoot() {
  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/user/giao-dien");
        if (!res.ok || cancelled) {
          if (res.status === 401) clearUserShellTheme();
          return;
        }
        const data = (await res.json()) as { theme?: ProfileThemeSlice };
        if (cancelled || !data.theme) return;
        applyUserShellTheme(data.theme);
      } catch {
        /* giữ token / SSR attrs */
      }
    })();

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ProfileThemeSlice>).detail;
      if (detail) applyUserShellTheme(detail);
    };

    window.addEventListener(USER_THEME_CHANGE_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(USER_THEME_CHANGE_EVENT, onChange);
    };
  }, []);

  return null;
}
