import { GuestHomeForceLightEffect } from "@/components/cins/guest-home/GuestHomeForceLightEffect";
import { FORCE_LIGHT_THEME_SCRIPT } from "@/lib/theme/theme-mode";

/**
 * Trang chủ khi chưa đăng nhập luôn dùng nền sáng, bất kể lựa chọn đã lưu
 * hay cài đặt hệ điều hành.
 *
 * - Server component: inline <script> chỉ nằm trong HTML SSR (chạy trước paint
 *   khi tải cứng) và được hydrate khớp — KHÔNG re-render trên client. Trước đây
 *   component này là "use client" nên React tạo lại thẻ <script> khi render phía
 *   client → cảnh báo "Encountered a script tag…" và phá hydration của cả
 *   <main> (form đăng nhập mất onSubmit → bấm "Đăng nhập" không phản ứng).
 * - `GuestHomeForceLightEffect` (client) giữ nền sáng ở runtime: soft-nav,
 *   Strict Mode và trả theme về cũ khi rời trang.
 */
export function GuestHomeThemeLight() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FORCE_LIGHT_THEME_SCRIPT }} />
      <GuestHomeForceLightEffect />
    </>
  );
}
