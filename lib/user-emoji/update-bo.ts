import "server-only";

import { isCloudflareImageId } from "@/lib/chat/image-url";
import { MAX_USER_EMOJI_BO_NAME } from "@/lib/user-emoji/constants";
import { boThumbnailUrl } from "@/lib/user-emoji/thumbnail";
import type { UserEmojiBo } from "@/lib/user-emoji/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type BoRow = {
  id: string;
  ten: string;
  thu_tu: number;
  cloudflare_id_anh_bia: string | null;
};

function mapBo(row: BoRow, items: UserEmojiBo["items"] = []): UserEmojiBo {
  return {
    id: row.id,
    ten: row.ten,
    thuTu: row.thu_tu,
    cloudflareIdAnhBia: row.cloudflare_id_anh_bia,
    thumbnailUrl: boThumbnailUrl(row.cloudflare_id_anh_bia, items),
    items,
  };
}

export async function updateUserEmojiBo(params: {
  boId: string;
  userId: string;
  ten?: string;
  thuTu?: number;
  cloudflareIdAnhBia?: string | null;
}): Promise<{ ok: true; bo: UserEmojiBo } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("user_emoji_bo")
    .select("id, id_nguoi_dung, ten, thu_tu, cloudflare_id_anh_bia")
    .eq("id", params.boId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      ten: string;
      thu_tu: number;
      cloudflare_id_anh_bia: string | null;
    }>();

  if (!existing) return { ok: false, error: "Không tìm thấy bộ meme." };
  if (existing.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Không có quyền sửa bộ meme này." };
  }

  const patch: {
    ten?: string;
    thu_tu?: number;
    cloudflare_id_anh_bia?: string | null;
    cap_nhat_luc: string;
  } = {
    cap_nhat_luc: new Date().toISOString(),
  };

  if (params.ten !== undefined) {
    const ten = params.ten.trim();
    if (!ten) return { ok: false, error: "Tên bộ meme không được trống." };
    if (ten.length > MAX_USER_EMOJI_BO_NAME) {
      return { ok: false, error: `Tên bộ meme tối đa ${MAX_USER_EMOJI_BO_NAME} ký tự.` };
    }
    patch.ten = ten;
  }

  if (params.thuTu !== undefined) {
    patch.thu_tu = params.thuTu;
  }

  if (params.cloudflareIdAnhBia !== undefined) {
    if (params.cloudflareIdAnhBia === null) {
      patch.cloudflare_id_anh_bia = null;
    } else {
      const cover = params.cloudflareIdAnhBia.trim();
      if (!isCloudflareImageId(cover)) {
        return { ok: false, error: "Ảnh bìa không hợp lệ." };
      }
      patch.cloudflare_id_anh_bia = cover;
    }
  }

  const { data, error } = await admin
    .from("user_emoji_bo")
    .update(patch)
    .eq("id", params.boId)
    .select("id, ten, thu_tu, cloudflare_id_anh_bia")
    .single<BoRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật được bộ meme." };
  }

  return {
    ok: true,
    bo: mapBo(data),
  };
}
