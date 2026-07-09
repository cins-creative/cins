import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ResolvedUserEmojiMuc = {
  id: string;
  cloudflareId: string;
};

/** Meme thuộc user — dùng khi gửi tin chat sticker. */
export async function resolveOwnedUserEmojiMuc(
  mucId: string,
  userId: string,
): Promise<ResolvedUserEmojiMuc | null> {
  const admin = createServiceRoleClient();
  const { data: muc } = await admin
    .from("user_emoji_muc")
    .select("id, cloudflare_id, id_bo")
    .eq("id", mucId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string; cloudflare_id: string; id_bo: string }>();

  if (!muc) return null;

  const { data: bo } = await admin
    .from("user_emoji_bo")
    .select("id_nguoi_dung")
    .eq("id", muc.id_bo)
    .maybeSingle<{ id_nguoi_dung: string }>();

  if (!bo || bo.id_nguoi_dung !== userId) return null;

  return {
    id: muc.id,
    cloudflareId: muc.cloudflare_id.trim(),
  };
}
