import "server-only";

import { isChatVideoKey } from "@/lib/chat/video-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CHAT_VIDEO_TITLE = "Tin nhắn video";
/** Trần số video mỗi người / 24h — guardrail chi phí + spam. */
export const MAX_CHAT_VIDEO_PER_DAY = 50;

export type CreateChatVideoMediaInput = {
  r2Key: string;
  viewerId: string;
  width?: number | null;
  height?: number | null;
  durationS?: number | null;
};

/**
 * Tạo / tái sử dụng `content_media` cho video chat (R2 key). Dedup theo
 * `cloudflare_id` (content-hash key) → video giống hệt chỉ lưu 1 hàng.
 */
export async function ensureChatVideoMediaId(
  input: CreateChatVideoMediaInput,
): Promise<string | null> {
  const key = input.r2Key.trim();
  if (!isChatVideoKey(key)) return null;

  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("content_media")
    .select("id")
    .eq("cloudflare_id", key)
    .maybeSingle<{ id: string }>();
  if (existing?.id) return existing.id;

  const { data: tacPham, error: tacErr } = await admin
    .from("content_tac_pham")
    .insert({
      id_nguoi_dung: input.viewerId,
      loai_tac_pham: "video",
      tieu_de: CHAT_VIDEO_TITLE,
      che_do_hien_thi: "chi_minh",
      noi_dung_blocks: [],
    })
    .select("id")
    .single<{ id: string }>();
  if (tacErr || !tacPham?.id) return null;

  const { data: media, error: mediaErr } = await admin
    .from("content_media")
    .insert({
      id_tac_pham: tacPham.id,
      cloudflare_id: key,
      loai_media: "video",
      thu_tu: 0,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_s: input.durationS ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (mediaErr || !media?.id) return null;
  return media.id;
}

/** true nếu người dùng còn hạn ngạch video trong 24h. */
export async function withinChatVideoDailyLimit(
  viewerId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("content_tac_pham")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", viewerId)
    .eq("loai_tac_pham", "video")
    .eq("tieu_de", CHAT_VIDEO_TITLE)
    .gte("tao_luc", since);
  return (count ?? 0) < MAX_CHAT_VIDEO_PER_DAY;
}
