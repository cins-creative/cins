import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

const ORG_ADMIN_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
] as const;

/**
 * Quyền ghi API inline trường theo `org_to_chuc.id` + `user_nguoi_dung.id`.
 *
 * Trục 2 (quan hệ) thuần: CHỈ dựa vào membership org. Quyền admin hệ thống
 * (trục 1) KHÔNG mở khoá sửa trang org — admin can thiệp qua trang `/admin`.
 */
export async function isTruongOrgAdmin(
  orgId: string,
  profileId: string,
): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("org_to_chuc")
      .select("id")
      .eq("id", orgId.trim())
      .maybeSingle();

    if (!org?.id) return false;

    const { data } = await supabase
      .from("user_thanh_vien_to_chuc")
      .select("vai_tro")
      .eq("id_to_chuc", org.id)
      .eq("id_nguoi_dung", profileId)
      .in("vai_tro", [...ORG_ADMIN_ROLES])
      .limit(1)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Precondition kỹ thuật cho server actions / API ghi DB:
 * Yêu cầu service role key. KHÔNG còn dùng làm gate hiển thị toolbar.
 */
export function canUseTruongInlineEdit(): boolean {
  return hasServiceRoleEnv();
}

/**
 * Quyền quản trị trang trường cho UI inline edit — **trục 2 (quan hệ) thuần**.
 *
 * Trả `true` CHỈ khi user login là member của `org_to_chuc` với một trong các
 * `vai_tro` admin (`owner`, `admin`, `quan_ly_noi_dung`, `quan_ly_tuyen_sinh`).
 *
 * Quyền admin hệ thống CINs (trục 1) KHÔNG mở khoá toolbar/inline-edit ở đây:
 * admin can thiệp qua trang `/admin`, không "đi vào" trang org của người khác.
 *
 * Mọi trường hợp khác (anon, user bình thường, admin không phải member) → `false`.
 *
 * @param profileId — `user_nguoi_dung.id` (KHÔNG phải `auth.users.id`).
 */
export async function getOrgAdminStatus(
  slug: string,
  profileId?: string | null,
): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;

  if (!profileId) return false;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("org_to_chuc")
      .select("id")
      .eq("slug", slug.trim())
      .maybeSingle();

    if (!org?.id) return false;

    return isTruongOrgAdmin(org.id, profileId);
  } catch {
    return false;
  }
}
