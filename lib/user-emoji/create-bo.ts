import "server-only";

import {
  MAX_USER_EMOJI_BO,
  MAX_USER_EMOJI_BO_NAME,
} from "@/lib/user-emoji/constants";
import type { UserEmojiBo } from "@/lib/user-emoji/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type BoRow = {
  id: string;
  ten: string;
  thu_tu: number;
};

export async function createUserEmojiBo(params: {
  userId: string;
  ten: string;
  thuTu?: number;
}): Promise<{ ok: true; bo: UserEmojiBo } | { ok: false; error: string }> {
  const ten = params.ten.trim();
  if (!ten) return { ok: false, error: "Tên bộ meme không được trống." };
  if (ten.length > MAX_USER_EMOJI_BO_NAME) {
    return { ok: false, error: `Tên bộ meme tối đa ${MAX_USER_EMOJI_BO_NAME} ký tự.` };
  }

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("user_emoji_bo")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", params.userId);

  if ((count ?? 0) >= MAX_USER_EMOJI_BO) {
    return {
      ok: false,
      error: `Tối đa ${MAX_USER_EMOJI_BO} bộ meme mỗi tài khoản.`,
    };
  }

  const { data, error } = await admin
    .from("user_emoji_bo")
    .insert({
      id_nguoi_dung: params.userId,
      ten,
      thu_tu: params.thuTu ?? 0,
    })
    .select("id, ten, thu_tu")
    .single<BoRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo được bộ meme." };
  }

  return {
    ok: true,
    bo: {
      id: data.id,
      ten: data.ten,
      thuTu: data.thu_tu,
      cloudflareIdAnhBia: null,
      thumbnailUrl: null,
      items: [],
    },
  };
}
