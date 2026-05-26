import "server-only";

import { createClient } from "@/lib/supabase/server";

import { isCinsAdminEmail } from "@/lib/auth/cins-admin";

/**
 * Server-side helper: xác định user hiện tại có phải CINs admin không.
 *
 * Tham chiếu danh sách email trong `lib/auth/cins-admin.ts` (CINS_ADMIN_EMAILS).
 * Trả `false` cho mọi trường hợp không xác định được session (anon, lỗi network, ...).
 *
 * Dùng để gate các toolbar quản trị inline (NganhHubAdminToolbar,
 * NganhAdminToolbar, TruongAdminToolbar) — chỉ admin CINs hoặc role org tương ứng
 * mới thấy.
 */
export async function getCurrentUserIsCinsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return isCinsAdminEmail(user?.email);
  } catch {
    return false;
  }
}
