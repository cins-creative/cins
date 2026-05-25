import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ORG_ADMIN_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
] as const;

/** Dev / nội bộ: bật chế độ sửa khi inline edit + service role. */
export function canUseTruongInlineEdit(): boolean {
  return isInlineArticleEditEnabled() && hasServiceRoleEnv();
}

export async function getOrgAdminStatus(
  slug: string,
  userId?: string | null,
): Promise<boolean> {
  if (canUseTruongInlineEdit() && !userId) {
    return true;
  }

  if (!userId) return false;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("org_to_chuc")
      .select("id")
      .eq("slug", slug.trim())
      .maybeSingle();

    if (!org?.id) return false;

    const { data } = await supabase
      .from("user_thanh_vien_to_chuc")
      .select("vai_tro")
      .eq("id_to_chuc", org.id)
      .eq("id_nguoi_dung", userId)
      .in("vai_tro", [...ORG_ADMIN_ROLES])
      .limit(1)
      .maybeSingle();

    return !!data;
  } catch {
    return canUseTruongInlineEdit();
  }
}
