import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/**
 * Quyền sửa bài inline trên trang public (hero nút bút, form tại chỗ).
 * Cần service role trên server + email trong `CINS_ADMIN_EMAILS`.
 */
export async function getArticleInlineAdminStatus(): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;
  return await getCurrentUserIsCinsAdmin();
}
