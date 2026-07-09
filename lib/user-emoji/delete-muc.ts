import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function deleteUserEmojiMuc(params: {
  boId: string;
  itemId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: bo } = await admin
    .from("user_emoji_bo")
    .select("id, id_nguoi_dung")
    .eq("id", params.boId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (!bo) return { ok: false, error: "Không tìm thấy bộ meme." };
  if (bo.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Không có quyền xóa meme trong bộ này." };
  }

  const { data: item } = await admin
    .from("user_emoji_muc")
    .select("id")
    .eq("id", params.itemId)
    .eq("id_bo", params.boId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string }>();

  if (!item) return { ok: false, error: "Không tìm thấy meme." };

  const { error } = await admin
    .from("user_emoji_muc")
    .update({ da_xoa: true })
    .eq("id", params.itemId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
