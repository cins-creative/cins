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

/** Admin CINs (trục 1) chỉ mở khoá vận hành trang `truong_dai_hoc` — L23 hẹp. */
async function isCinsAdminOnTruongDaiHoc(orgId: string): Promise<boolean> {
  if (!(await getCurrentUserIsCinsAdmin())) return false;
  if (!hasServiceRoleEnv()) return false;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("org_to_chuc")
      .select("id")
      .eq("id", orgId.trim())
      .eq("loai_to_chuc", "truong_dai_hoc")
      .maybeSingle();
    return !!org?.id;
  } catch {
    return false;
  }
}

/**
 * Quyền ghi API inline trường theo `org_to_chuc.id` + `user_nguoi_dung.id`.
 *
 * Hai trục (L23 hẹp): membership org (trục 2) **HOẶC** admin CINs trên
 * `truong_dai_hoc` (trục 1). Cơ sở / studio / cộng đồng chỉ theo membership.
 */
export async function isTruongOrgAdmin(
  orgId: string,
  profileId: string,
): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;

  if (await isCinsAdminOnTruongDaiHoc(orgId)) return true;

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
 * Quyền quản trị trang org cho UI inline edit (dùng chung cho trường ĐH,
 * cơ sở, studio qua slug `org_to_chuc`).
 *
 * Trả `true` khi (L23 hẹp):
 * - user login là member org với `vai_tro` admin
 *   (`owner`, `admin`, `quan_ly_noi_dung`, `quan_ly_tuyen_sinh`) — trục 2; HOẶC
 * - user login là admin CINs **và** org là `truong_dai_hoc` — trục 1.
 *
 * @param profileId — `user_nguoi_dung.id` (KHÔNG phải `auth.users.id`).
 */
export async function getOrgAdminStatus(
  slug: string,
  profileId?: string | null,
): Promise<boolean> {
  if (!hasServiceRoleEnv()) return false;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("org_to_chuc")
      .select("id, loai_to_chuc")
      .eq("slug", slug.trim())
      .maybeSingle<{ id: string; loai_to_chuc: string }>();

    if (!org?.id) return false;

    if (
      org.loai_to_chuc === "truong_dai_hoc" &&
      (await getCurrentUserIsCinsAdmin())
    ) {
      return true;
    }

    if (!profileId) return false;

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
