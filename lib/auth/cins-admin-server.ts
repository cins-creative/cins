import "server-only";

import { cache } from "react";

import { getCurrentUserSystemRole } from "@/lib/auth/system-role";

/**
 * Server-side helper: user hiện tại có quyền admin cấp hệ thống CINs không
 * (`super_admin` hoặc `admin` từ `user_quyen_he_thong` / email super_admin).
 *
 * Trả `false` khi không xác định được session (anon, lỗi network, ...).
 *
 * Quyền admin CINs (trục 1) mở khoá vận hành trang org (inline-edit, quản lý
 * thành viên, bàn giao) trên MỌI loại org — độc lập với membership (trục 2).
 * Đây là "quyền CINs", khác quyền owner: hành động dưới danh nghĩa hệ thống.
 * Xem `CINS_DECISIONS.md` L23 (đảo L20).
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
