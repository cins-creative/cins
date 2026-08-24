import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type GoKhiLogoutInput = {
  userId: string;
  /** Nếu có — chỉ gỡ đúng thiết bị. Không có — gỡ mọi FCM của user (máy dùng chung an toàn hơn khi logout). */
  token?: string | null;
};

/**
 * Gỡ đăng ký push khi logout — chống push nhầm người trên máy dùng chung.
 * Soft: set mat_hieu_luc_luc (giữ lịch sử). Hard delete nếu muốn gọn hơn ở phase sau.
 */
export async function goPushKhiLogout(
  input: GoKhiLogoutInput,
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  let q = admin
    .from("user_web_push")
    .update({ mat_hieu_luc_luc: now, cap_nhat_luc: now })
    .eq("id_nguoi_dung", input.userId)
    .in("nen_tang", ["ios", "android"])
    .is("mat_hieu_luc_luc", null);

  const token = input.token?.trim();
  if (token) {
    q = q.eq("token", token);
  }

  const { data, error } = await q.select("id");
  if (error) return { ok: false, error: error.message };
  return { ok: true, updated: data?.length ?? 0 };
}
