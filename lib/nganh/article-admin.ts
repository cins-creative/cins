import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** Dev / nội bộ: bật chế độ sửa khi inline edit + service role. */
export function canUseNganhInlineEdit(): boolean {
  return isInlineArticleEditEnabled() && hasServiceRoleEnv();
}

/** Quyền quản trị trang ngành (hiện tại = dev gate; sau có thể gắn vai trò bài viết). */
export async function getNganhAdminStatus(_slug: string): Promise<boolean> {
  return canUseNganhInlineEdit();
}
