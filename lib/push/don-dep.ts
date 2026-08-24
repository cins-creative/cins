import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Đánh dấu thiết bị mất hiệu lực (FCM 404/410 hoặc gỡ thủ công). */
export async function danhDauMatHieuLuc(
  rowId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("user_web_push")
    .update({
      mat_hieu_luc_luc: new Date().toISOString(),
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", rowId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Xoá cứng theo token (khi biết chắc token chết / user gỡ). */
export async function xoaTheoToken(
  token: string,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const t = token.trim();
  if (!t) return { ok: false, error: "Thiếu token." };

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_web_push")
    .delete()
    .eq("token", t)
    .select("id");

  if (error) return { ok: false, error: error.message };
  return { ok: true, deleted: data?.length ?? 0 };
}
