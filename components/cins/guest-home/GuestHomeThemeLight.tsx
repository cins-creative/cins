"use client";

import { useLayoutEffect } from "react";

import {
  FORCE_LIGHT_THEME_SCRIPT,
  acquireForceLightTheme,
} from "@/lib/theme/theme-mode";

/**
 * Trang chủ khi chưa đăng nhập luôn dùng nền sáng, bất kể lựa chọn đã lưu
 * hay cài đặt hệ điều hành.
 *
 * - Inline <script> trong output của component (SSR một lần tại vị trí guest home)
 *   ghi đè data-theme trước paint — không dùng useServerInsertedHTML (streaming
 *   gọi callback mỗi chunk → nhân bản script / phá hydration).
 * - useLayoutEffect + acquireForceLightTheme xử lý soft-nav và Strict Mode
 *   (cleanup microtask không nháy dark giữa hai lần mount).
 * - Khi rời trang, trả theme về lựa chọn đã lưu.
 */
export function GuestHomeThemeLight() {
  useLayoutEffect(() => acquireForceLightTheme(), []);

  return (
    <script dangerouslySetInnerHTML={{ __html: FORCE_LIGHT_THEME_SCRIPT }} />
  );
}
