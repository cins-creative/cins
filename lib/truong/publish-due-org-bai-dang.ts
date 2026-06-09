import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Đẩy bài `nhap` đã quá `tao_luc` lên `da_dang` (lazy publish khi đọc feed). */
export async function publishDueOrgBaiDang(orgId?: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  let q = supabase
    .from("org_bai_dang")
    .update({ trang_thai: "da_dang" })
    .eq("trang_thai", "nhap")
    .lte("tao_luc", now);
  if (orgId?.trim()) {
    q = q.eq("id_to_chuc", orgId.trim());
  }
  const { error } = await q;
  if (error) {
    console.error("[publishDueOrgBaiDang]", error.message);
  }
}
