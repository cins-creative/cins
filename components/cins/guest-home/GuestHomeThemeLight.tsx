"use client";

import { useLayoutEffect } from "react";
import { useServerInsertedHTML } from "next/navigation";

import {
  FORCE_LIGHT_THEME_SCRIPT,
  acquireForceLightTheme,
} from "@/lib/theme/theme-mode";

/**
 * Trang chủ khi chưa đăng nhập luôn dùng nền sáng, bất kể lựa chọn đã lưu
 * hay cài đặt hệ điều hành.
 *
 * - useServerInsertedHTML inject script trước paint (tránh nháy + React 19
 *   warning khi return <script> từ client component).
 * - useLayoutEffect + acquireForceLightTheme xử lý soft-nav và Strict Mode
 *   (cleanup microtask không nháy dark giữa hai lần mount).
 * - Khi rời trang, trả theme về lựa chọn đã lưu.
 */
export function GuestHomeThemeLight() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: FORCE_LIGHT_THEME_SCRIPT }} />
  ));

  useLayoutEffect(() => acquireForceLightTheme(), []);

  return null;
}
