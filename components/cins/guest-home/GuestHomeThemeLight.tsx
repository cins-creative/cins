"use client";

import { useLayoutEffect } from "react";

import {
  applyResolvedTheme,
  readThemeMode,
  resolveTheme,
} from "@/lib/theme/theme-mode";

/**
 * Trang chủ khi chưa đăng nhập luôn dùng nền sáng, bất kể lựa chọn đã lưu
 * hay cài đặt hệ điều hành.
 *
 * - Inline script chạy ngay khi trình duyệt parse HTML (trước paint) để tránh
 *   nháy nền trong lần tải đầu — ghi đè giá trị mà script no-flash ở layout đặt.
 * - `useLayoutEffect` xử lý trường hợp điều hướng phía client (script inline
 *   không chạy lại), áp nền sáng trước khi paint.
 * - Khi rời trang, khôi phục theme theo lựa chọn đã lưu để không ảnh hưởng các
 *   trang khác.
 */
const FORCE_LIGHT_SCRIPT =
  '(function(){try{var r=document.documentElement;r.setAttribute("data-theme","light");r.style.colorScheme="light";}catch(e){}})();';

export function GuestHomeThemeLight() {
  useLayoutEffect(() => {
    applyResolvedTheme("light");
    return () => {
      applyResolvedTheme(resolveTheme(readThemeMode()));
    };
  }, []);

  return <script dangerouslySetInnerHTML={{ __html: FORCE_LIGHT_SCRIPT }} />;
}
