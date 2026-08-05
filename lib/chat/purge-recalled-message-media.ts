import "server-only";

import { isCloudflareImageId } from "@/lib/chat/image-url";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import {
  deleteChatVideoObject,
  isValidChatVideoKey,
} from "@/lib/cloudflare/r2-chat-video";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Sau soft-delete tin chat: hard-delete asset gốc (CF Images / R2) nếu không
 * còn tham chiếu sống. Sticker/meme giữ nguyên (asset thuộc bộ emoji user).
 *
 * Best-effort — lỗi xóa asset không throw (không đảo soft-delete).
 * Không xóa row `content_media` / `chat_tin_nhan` (FK + soft-delete DB).
 */
export async function purgeRecalledMessageMedia(input: {
  mediaId: string | null | undefined;
  loaiTin: string | null | undefined;
}): Promise<void> {
  const mediaId = input.mediaId?.trim();
  if (!mediaId) return;
  /* Meme sống trong user_emoji — thu hồi tin không được xóa file gốc. */
  if (input.loaiTin === "sticker") return;

  const admin = createServiceRoleClient();

  const { count: liveMsgCount } = await admin
    .from("chat_tin_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_dinh_kem", mediaId)
    .eq("da_xoa", false);
  if ((liveMsgCount ?? 0) > 0) return;

  /* Bài nộp lớp vẫn cần media (Journey từ bài nộp copy cùng CF id). */
  const { count: nopCount } = await admin
    .from("org_nop_bai")
    .select("id", { count: "exact", head: true })
    .eq("id_media", mediaId);
  if ((nopCount ?? 0) > 0) return;

  const { data: media } = await admin
    .from("content_media")
    .select("id, cloudflare_id, loai_media")
    .eq("id", mediaId)
    .maybeSingle<{
      id: string;
      cloudflare_id: string | null;
      loai_media: string | null;
    }>();

  const assetId = media?.cloudflare_id?.trim();
  if (!media || !assetId) return;

  /* Còn content_media khác cùng asset (hiếm — ensure* dedup theo id). */
  const { count: siblingMedia } = await admin
    .from("content_media")
    .select("id", { count: "exact", head: true })
    .eq("cloudflare_id", assetId)
    .neq("id", mediaId);
  if ((siblingMedia ?? 0) > 0) return;

  if (media.loai_media === "video") {
    if (!isValidChatVideoKey(assetId)) return;
    await deleteChatVideoObject(assetId);
    return;
  }

  if (!isCloudflareImageId(assetId)) return;

  /* Ảnh còn trong bộ meme user → không xóa. */
  const { count: emojiCount } = await admin
    .from("user_emoji_muc")
    .select("id", { count: "exact", head: true })
    .eq("cloudflare_id", assetId)
    .eq("da_xoa", false);
  if ((emojiCount ?? 0) > 0) return;

  const [coverRefs, avatarRefs, orgRefs, blockRefs] = await Promise.all([
    admin
      .from("content_tac_pham")
      .select("id", { count: "exact", head: true })
      .eq("cover_id", assetId),
    admin
      .from("user_nguoi_dung")
      .select("id", { count: "exact", head: true })
      .eq("avatar_id", assetId),
    admin
      .from("org_to_chuc")
      .select("id", { count: "exact", head: true })
      .or(`avatar_id.eq.${assetId},cover_id.eq.${assetId}`),
    admin
      .from("content_tac_pham")
      .select("id", { count: "exact", head: true })
      .ilike("noi_dung_blocks", `%${assetId}%`),
  ]);

  if (
    [coverRefs, avatarRefs, orgRefs, blockRefs].some(
      (res) => (res.count ?? 0) > 0,
    )
  ) {
    return;
  }

  await deleteCloudflareImage(assetId);
}
