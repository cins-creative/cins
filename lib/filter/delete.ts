import "server-only";

import { isSystemPersonalFilterSlug } from "@/lib/filter/default-personal-filters.shared";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function deleteUserFilter(params: {
  filterId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("filter_nhan")
    .select("id, id_nguoi_dung, slug")
    .eq("id", params.filterId)
    .maybeSingle<{ id: string; id_nguoi_dung: string | null; slug: string }>();

  if (!existing || existing.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Không tìm thấy nhãn hoặc bạn không có quyền xóa." };
  }
  if (isSystemPersonalFilterSlug(existing.slug)) {
    return { ok: false, error: "Không thể xóa nhãn mặc định của hệ thống." };
  }

  const { error } = await admin.from("filter_nhan").delete().eq("id", params.filterId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
