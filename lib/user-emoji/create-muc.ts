import "server-only";

import { isCloudflareImageId } from "@/lib/chat/image-url";
import {
  MAX_USER_EMOJI_MUC_NAME,
  MAX_USER_EMOJI_MUC_PER_BO,
} from "@/lib/user-emoji/constants";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type MucRow = {
  id: string;
  id_bo: string;
  cloudflare_id: string;
  ten_goi: string | null;
  thu_tu: number;
};

export async function createUserEmojiMuc(params: {
  boId: string;
  userId: string;
  cloudflareId: string;
  tenGoi?: string;
  thuTu?: number;
}): Promise<{ ok: true; item: UserEmojiMuc } | { ok: false; error: string }> {
  const cloudflareId = params.cloudflareId.trim();
  if (!isCloudflareImageId(cloudflareId)) {
    return { ok: false, error: "Ảnh meme không hợp lệ." };
  }

  let tenGoi: string | null = null;
  if (params.tenGoi !== undefined) {
    const raw = params.tenGoi.trim();
    if (raw.length > MAX_USER_EMOJI_MUC_NAME) {
      return { ok: false, error: `Tên gọi tối đa ${MAX_USER_EMOJI_MUC_NAME} ký tự.` };
    }
    tenGoi = raw || null;
  }

  const admin = createServiceRoleClient();
  const { data: bo } = await admin
    .from("user_emoji_bo")
    .select("id, id_nguoi_dung, cloudflare_id_anh_bia")
    .eq("id", params.boId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      cloudflare_id_anh_bia: string | null;
    }>();

  if (!bo) return { ok: false, error: "Không tìm thấy bộ meme." };
  if (bo.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Không có quyền thêm meme vào bộ này." };
  }

  const { count } = await admin
    .from("user_emoji_muc")
    .select("id", { count: "exact", head: true })
    .eq("id_bo", params.boId)
    .eq("da_xoa", false);

  if ((count ?? 0) >= MAX_USER_EMOJI_MUC_PER_BO) {
    return {
      ok: false,
      error: `Tối đa ${MAX_USER_EMOJI_MUC_PER_BO} meme mỗi bộ.`,
    };
  }

  const { data, error } = await admin
    .from("user_emoji_muc")
    .insert({
      id_bo: params.boId,
      cloudflare_id: cloudflareId,
      ten_goi: tenGoi,
      thu_tu: params.thuTu ?? 0,
    })
    .select("id, id_bo, cloudflare_id, ten_goi, thu_tu")
    .single<MucRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không thêm được meme." };
  }

  if (!bo.cloudflare_id_anh_bia) {
    await admin
      .from("user_emoji_bo")
      .update({
        cloudflare_id_anh_bia: cloudflareId,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", params.boId);
  }

  return {
    ok: true,
    item: {
      id: data.id,
      boId: data.id_bo,
      cloudflareId: data.cloudflare_id,
      url: userEmojiDeliveryUrl(data.cloudflare_id),
      tenGoi: data.ten_goi,
      thuTu: data.thu_tu,
    },
  };
}
