import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function deleteUserEmojiBo(params: {
  boId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("user_emoji_bo")
    .select("id, id_nguoi_dung")
    .eq("id", params.boId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (!existing) return { ok: false, error: "Không tìm thấy bộ meme." };
  if (existing.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Không có quyền xóa bộ meme này." };
  }

  const { error } = await admin.from("user_emoji_bo").delete().eq("id", params.boId);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
