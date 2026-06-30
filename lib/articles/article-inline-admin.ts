import "server-only";

import {
  canEditContent,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/**
 * Quyền sửa bài inline trên trang public (hero nút bút, form tại chỗ).
 * Cần service role + vai trò super_admin / admin / curator.
 */
export async function getArticleInlineAdminStatus(): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;
  const role = await getCurrentUserSystemRole();
  return canEditContent(role);
}
