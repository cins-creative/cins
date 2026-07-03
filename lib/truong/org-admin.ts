import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

const ORG_ADMIN_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
] as const;

/**
 * Membership org THUẦN (trục 2) theo `org_to_chuc.id` — KHÔNG tính quyền admin
 * CINs (trục 1). Dùng để phân biệt "org của tôi" (member thật) với "tôi đang
 * giám sát với tư cách CINs": nút theo dõi / nhắn tin chỉ khoá với member thật,
 * còn admin CINs vẫn là user thường (theo dõi / nhắn tin / like được).
 */
async function isTruongOrgMemberAdmin(
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
 * Quyền ghi API inline trường theo `org_to_chuc.id` + `user_nguoi_dung.id`.
 *
 * Hai trục (L23, đảo L20): membership org (trục 2) **HOẶC** quyền admin CINs
 * (trục 1 — `super_admin`/`admin`) đều mở khoá. Admin CINs vận hành trực tiếp
 * trên trang org dưới danh nghĩa hệ thống (khác quyền owner).
 */
export async function isTruongOrgAdmin(
  orgId: string,
  profileId: string,
): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;

  // Quyền CINs (trục 1) mở khoá vận hành mọi org — độc lập membership.
  if (await getCurrentUserIsCinsAdmin()) return true;

  return isTruongOrgMemberAdmin(orgId, profileId);
}

/**
 * Precondition kỹ thuật cho server actions / API ghi DB:
 * Yêu cầu service role key. KHÔNG còn dùng làm gate hiển thị toolbar.
 */
export function canUseTruongInlineEdit(): boolean {
  return hasServiceRoleEnv();
}

/**
 * Quyền quản trị trang trường cho UI inline edit (dùng chung cho trường ĐH,
 * cơ sở, studio qua slug `org_to_chuc`).
 *
 * Trả `true` khi (L23, đảo L20):
 * - user login là member org với `vai_tro` admin
 *   (`owner`, `admin`, `quan_ly_noi_dung`, `quan_ly_tuyen_sinh`) — trục 2; HOẶC
 * - user login là admin CINs (`super_admin`/`admin`) — trục 1, mọi org.
 *
 * @param profileId — `user_nguoi_dung.id` (KHÔNG phải `auth.users.id`).
 */
export async function getOrgAdminStatus(
  slug: string,
  profileId?: string | null,
): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;

  // Quyền CINs (trục 1) mở khoá vận hành mọi org — độc lập membership.
  if (await getCurrentUserIsCinsAdmin()) return true;

  if (!profileId) return false;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("org_to_chuc")
      .select("id")
      .eq("slug", slug.trim())
      .maybeSingle();

    if (!org?.id) return false;

    return isTruongOrgMemberAdmin(org.id, profileId);
  } catch {
    return false;
  }
}

/**
 * Membership org THUẦN (trục 2) theo slug — KHÔNG tính admin CINs (trục 1).
 *
 * Trả `true` CHỈ khi viewer là member thật của org với `vai_tro` admin. Dùng
 * cho UI phân biệt "org của tôi" (khoá theo dõi/nhắn tin chính mình) với "admin
 * CINs đang giám sát" (vẫn theo dõi/nhắn tin/like như user thường).
 */
export async function getOrgMemberStatus(
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

    return isTruongOrgMemberAdmin(org.id, profileId);
  } catch {
    return false;
  }
}
