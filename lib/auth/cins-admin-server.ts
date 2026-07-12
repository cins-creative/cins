import "server-only";

import { cache } from "react";

import { getCurrentUserSystemRole } from "@/lib/auth/system-role";

/**
 * Server-side helper: user hiện tại có quyền admin cấp hệ thống CINs không
 * (`super_admin` hoặc `admin` từ `user_quyen_he_thong` / email super_admin).
 *
 * Trả `false` khi không xác định được session (anon, lỗi network, ...).
 *
 * Trên trang org công khai, quyền này **chỉ** mở khoá vận hành
 * `truong_dai_hoc` (inline-edit, settings) — xem `lib/truong/org-admin.ts`.
 * Cơ sở / studio / cộng đồng chỉ theo membership (trục 2); cứu hộ qua
 * `/admin/to-chuc` (L22). Xem `CINS_DECISIONS.md` L23 hẹp.
 *
 * `cache()` để dedupe trong 1 request (nhiều gate gọi cùng lúc).
 */
export const getCurrentUserIsCinsAdmin = cache(
  async function getCurrentUserIsCinsAdmin(): Promise<boolean> {
    try {
      const role = await getCurrentUserSystemRole();
      return role === "super_admin" || role === "admin";
    } catch {
      return false;
    }
  },
);
