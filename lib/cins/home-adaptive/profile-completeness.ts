import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ProfileCompleteness = {
  percent: number;
  missing: string[];
};

type ProfileRow = {
  avatar_id: string | null;
  bio: string | null;
  tinh_thanh: string | null;
  giai_doan: string | null;
  email_lien_he: string | null;
};

/**
 * Độ đầy hồ sơ user (module `ho_so_cua_ban`, cụm LÀM) — checklist nhẹ từ
 * profile + có ít nhất 1 cột mốc. Dùng để nudge "studio dễ tìm thấy bạn".
 */
export async function loadProfileCompleteness(
  viewerId: string,
): Promise<ProfileCompleteness> {
  const admin = createServiceRoleClient();

  const [{ data: profile }, { count }] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("avatar_id, bio, tinh_thanh, giai_doan, email_lien_he")
      .eq("id", viewerId)
      .maybeSingle<ProfileRow>(),
    admin
      .from("content_cot_moc")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", viewerId),
  ]);

  const checks: Array<[boolean, string]> = [
    [Boolean(profile?.avatar_id), "Thêm ảnh đại diện"],
    [Boolean(profile?.bio?.trim()), "Viết giới thiệu ngắn"],
    [Boolean(profile?.tinh_thanh), "Chọn tỉnh/thành"],
    [Boolean(profile?.giai_doan), "Cập nhật giai đoạn"],
    [(count ?? 0) > 0, "Đăng cột mốc đầu tiên"],
    [(count ?? 0) >= 3, "Có từ 3 cột mốc trở lên"],
  ];

  const done = checks.filter(([ok]) => ok).length;
  const percent = Math.round((done / checks.length) * 100);
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);

  return { percent, missing };
}
