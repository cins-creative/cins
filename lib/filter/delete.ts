import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function deleteUserFilter(params: {
  filterId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("filter_nhan")
    .select("id, id_nguoi_dung")
    .eq("id", params.filterId)
    .maybeSingle<{ id: string; id_nguoi_dung: string | null }>();

  if (!existing || existing.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Không tìm thấy nhãn hoặc bạn không có quyền xóa." };
  }

  const { error } = await admin.from("filter_nhan").delete().eq("id", params.filterId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
