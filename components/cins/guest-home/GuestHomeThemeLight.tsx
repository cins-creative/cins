"use client";

import { useLayoutEffect } from "react";

import { acquireForceLightTheme } from "@/lib/theme/theme-mode";

/**
 * Trang chủ khi chưa đăng nhập luôn dùng nền sáng, bất kể lựa chọn đã lưu
 * hay cài đặt hệ điều hành.
 *
 * - Inline script chạy ngay khi trình duyệt parse HTML (trước paint) để tránh
 *   nháy nền trong lần tải đầu — ghi đè giá trị mà script no-flash ở layout đặt.
 * - `useLayoutEffect` + `acquireForceLightTheme` xử lý soft-nav và Strict Mode
 *   (cleanup microtask không nháy dark giữa hai lần mount).
 * - Khi rời trang, trả theme về lựa chọn đã lưu.
 */
const FORCE_LIGHT_SCRIPT =
  '(function(){try{var r=document.documentElement;r.setAttribute("data-theme","light");r.style.colorScheme="light";}catch(e){}})();';

export function GuestHomeThemeLight() {
  useLayoutEffect(() => acquireForceLightTheme(), []);

  return <script dangerouslySetInnerHTML={{ __html: FORCE_LIGHT_SCRIPT }} />;
}
