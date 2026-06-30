import type { SystemRole } from "@/lib/auth/system-role";

/**
 * Nhãn vai trò hệ thống cho UI — client-safe (KHÔNG `server-only`).
 * Bản server dùng `systemRoleLabel` trong `lib/auth/system-role.ts`.
 */
export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: "Admin tối cao",
  admin: "Admin",
  curator: "Curator",
  thanh_vien: "Thành viên",
};

/** Vai trò có quyền quản trị (hiển thị badge/toolbar). `thanh_vien` = thường. */
export function isElevatedRole(
  role: SystemRole | null | undefined,
): role is "super_admin" | "admin" | "curator" {
  return role === "super_admin" || role === "admin" || role === "curator";
}
