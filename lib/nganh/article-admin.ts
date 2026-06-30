import {
  canEditContent,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/**
 * Precondition kỹ thuật cho server actions / API ghi DB:
 * Yêu cầu cả flag `CINS_INLINE_ARTICLE_EDIT` (hoặc dev) lẫn service role key.
 * KHÔNG còn dùng làm gate hiển thị toolbar — toolbar UI dùng
 * `getNganhAdminStatus()` (yêu cầu editor role).
 */
export function canUseNganhInlineEdit(): boolean {
  return isInlineArticleEditEnabled() && hasServiceRoleEnv();
}

/**
 * Quyền quản trị danh sách / chi tiết ngành cho UI inline edit.
 *
 * Chỉ trả `true` khi:
 *   1. Server có service role env (precondition để ghi DB)
 *   2. User có vai trò super_admin / admin / curator
 */
export async function getNganhAdminStatus(_slug: string): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;
  const role = await getCurrentUserSystemRole();
  return canEditContent(role);
}
