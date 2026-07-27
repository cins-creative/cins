"use client";

import { useLayoutEffect } from "react";

import { acquireForceLightTheme } from "@/lib/theme/theme-mode";

/**
 * Khoá nền sáng ở runtime cho guest home: giữ light qua soft-nav và React
 * Strict Mode, trả theme về lựa chọn đã lưu khi rời trang.
 *
 * Không render gì (kể cả <script>) — script no-flash trước paint do
 * `GuestHomeThemeLight` (server) phát ra một lần trong HTML.
 */
export function GuestHomeForceLightEffect() {
  useLayoutEffect(() => acquireForceLightTheme(), []);
  return null;
}
