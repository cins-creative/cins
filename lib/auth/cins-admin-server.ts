import "server-only";

import { getCurrentUserSystemRole } from "@/lib/auth/system-role";

/**
 * Server-side helper: user hiện tại có quyền admin cấp hệ thống CINs không
 * (`super_admin` hoặc `admin` từ `user_quyen_he_thong` / email super_admin).
 *
 * Trả `false` khi không xác định được session (anon, lỗi network, ...).
 *
 * Dùng gate toolbar quản trị inline (NganhHubAdminToolbar, TruongAdminToolbar, …)
 * — song song với quyền org tương ứng.
 */
export async function getCurrentUserIsCinsAdmin(): Promise<boolean> {
  try {
    const role = await getCurrentUserSystemRole();
    return role === "super_admin" || role === "admin";
  } catch {
    return false;
  }
}
