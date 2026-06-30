import "server-only";

import { CINS_ADMIN_EMAILS } from "@/lib/auth/cins-admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Email admin tối cao — bất biến, không lưu DB. */
export const SUPER_ADMIN_EMAIL = "info.cins.vn@gmail.com";

export type SystemRole = "super_admin" | "admin" | "curator" | "thanh_vien";

export type DbSystemRole = "admin" | "curator";

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const v = email.toLowerCase().trim();
  return v || null;
}

/**
 * Suy vai trò từ email auth + vai trò DB (nếu có).
 * Thứ tự: super_admin email → legacy CINS_ADMIN_EMAILS → DB → thanh_vien.
 */
export function resolveSystemRole(
  email: string | null | undefined,
  dbRole: DbSystemRole | null | undefined,
): SystemRole {
  const normalized = normalizeEmail(email);
  if (normalized === SUPER_ADMIN_EMAIL) return "super_admin";
  if (normalized && CINS_ADMIN_EMAILS.includes(normalized)) return "admin";
  if (dbRole === "admin") return "admin";
  if (dbRole === "curator") return "curator";
  return "thanh_vien";
}

export function canAccessAdminPanel(role: SystemRole): boolean {
  return role === "super_admin" || role === "admin" || role === "curator";
}

export function canManageUsers(role: SystemRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canGrantAdmin(role: SystemRole): boolean {
  return role === "super_admin";
}

export function canEditContent(role: SystemRole): boolean {
  return role === "super_admin" || role === "admin" || role === "curator";
}

export function systemRoleLabel(role: SystemRole): string {
  switch (role) {
    case "super_admin":
      return "Admin tối cao";
    case "admin":
      return "Admin";
    case "curator":
      return "Curator (Biên tập viên)";
    default:
      return "Thành viên";
  }
}

type DbRoleRow = { vai_tro: DbSystemRole };

async function fetchDbRoleForAuthUser(
  authUserId: string,
): Promise<DbSystemRole | null> {
  try {
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("user_nguoi_dung")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle<{ id: string }>();

    if (!profile?.id) return null;

    const { data: roleRow } = await admin
      .from("user_quyen_he_thong")
      .select("vai_tro")
      .eq("id_nguoi_dung", profile.id)
      .maybeSingle<DbRoleRow>();

    return roleRow?.vai_tro ?? null;
  } catch {
    return null;
  }
}

/** Vai trò hệ thống của user đang đăng nhập. */
export async function getCurrentUserSystemRole(): Promise<SystemRole> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "thanh_vien";

    const dbRole = await fetchDbRoleForAuthUser(user.id);
    return resolveSystemRole(user.email, dbRole);
  } catch {
    return "thanh_vien";
  }
}

/** Profile id (`user_nguoi_dung.id`) của user đang đăng nhập — dùng ghi audit `cap_boi`. */
export async function getCurrentUserProfileId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("user_nguoi_dung")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle<{ id: string }>();

    return profile?.id ?? null;
  } catch {
    return null;
  }
}
