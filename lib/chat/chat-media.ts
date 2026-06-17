import "server-only";

import { isCloudflareImageId } from "@/lib/chat/image-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Tạo hoặc tái sử dụng `content_media` cho ảnh chat (Cloudflare id). */
export async function ensureChatMediaId(
  cloudflareId: string,
  viewerId: string,
): Promise<string | null> {
  const cfId = cloudflareId.trim();
  if (!isCloudflareImageId(cfId)) return null;

  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("content_media")
    .select("id")
    .eq("cloudflare_id", cfId)
    .maybeSingle<{ id: string }>();

  if (existing?.id) return existing.id;

  const { data: tacPham, error: tacErr } = await admin
    .from("content_tac_pham")
    .insert({
      id_nguoi_dung: viewerId,
      loai_tac_pham: "image",
      tieu_de: "Tin nhắn ảnh",
      che_do_hien_thi: "chi_minh",
    })
    .select("id")
    .single<{ id: string }>();

  if (tacErr || !tacPham?.id) return null;

  const { data: media, error: mediaErr } = await admin
    .from("content_media")
    .insert({
      id_tac_pham: tacPham.id,
      cloudflare_id: cfId,
      loai_media: "anh",
      thu_tu: 0,
    })
    .select("id")
    .single<{ id: string }>();

  if (mediaErr || !media?.id) return null;
  return media.id;
}
