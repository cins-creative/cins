/**
 * Mô hình seed dùng chung — helper server (DB).
 * Plan: docs/PLAN_mo_hinh_seed.md
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type {
  TrangThaiSeed,
  TrangThaiSeedOrNull,
} from "@/lib/seed/trang-thai-seed.shared";

/**
 * Tài khoản seeding = có row `auto_tai_khoan` chưa bàn giao.
 * Dùng để quyết định page mới tạo bởi nick seed → `trang_thai_seed = 'clone'`.
 */
export async function laTaiKhoanSeed(
  db: SupabaseClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await db
    .from("auto_tai_khoan")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .neq("trang_thai_ban_giao", "da_ban_giao")
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}
