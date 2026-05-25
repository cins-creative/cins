import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** Dev / nội bộ: bật chế độ sửa khi inline edit + service role. */
export function canUseSoftwareInlineEdit(): boolean {
  return isInlineArticleEditEnabled() && hasServiceRoleEnv();
}

/** Quyền quản trị trang phần mềm (hiện tại = dev gate; sau có thể gắn vai trò bài viết). */
export async function getSoftwareAdminStatus(_slug: string): Promise<boolean> {
  return canUseSoftwareInlineEdit();
}
