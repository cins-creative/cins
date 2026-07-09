import "server-only";

import {
  MAX_USER_EMOJI_BO,
  MAX_USER_EMOJI_MUC_PER_BO,
} from "@/lib/user-emoji/constants";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import { boThumbnailUrl } from "@/lib/user-emoji/thumbnail";
import type { UserEmojiBo, UserEmojiMuc } from "@/lib/user-emoji/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type BoRow = {
  id: string;
  ten: string;
  thu_tu: number;
  cloudflare_id_anh_bia: string | null;
};

type MucRow = {
  id: string;
  id_bo: string;
  cloudflare_id: string;
  ten_goi: string | null;
  thu_tu: number;
};

function mapMuc(row: MucRow): UserEmojiMuc {
  return {
    id: row.id,
    boId: row.id_bo,
    cloudflareId: row.cloudflare_id,
    url: userEmojiDeliveryUrl(row.cloudflare_id),
    tenGoi: row.ten_goi,
    thuTu: row.thu_tu,
  };
}

export async function listUserEmojiPacks(
  userId: string,
): Promise<{ boList: UserEmojiBo[]; limits: { maxBo: number; maxMucPerBo: number } }> {
  const admin = createServiceRoleClient();

  const { data: boRows, error: boErr } = await admin
    .from("user_emoji_bo")
    .select("id, ten, thu_tu, cloudflare_id_anh_bia")
    .eq("id_nguoi_dung", userId)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });

  if (boErr || !boRows?.length) {
    return {
      boList: [],
      limits: { maxBo: MAX_USER_EMOJI_BO, maxMucPerBo: MAX_USER_EMOJI_MUC_PER_BO },
    };
  }

  const boIds = boRows.map((row) => row.id);
  const { data: mucRows } = await admin
    .from("user_emoji_muc")
    .select("id, id_bo, cloudflare_id, ten_goi, thu_tu")
    .in("id_bo", boIds)
    .eq("da_xoa", false)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });

  const mucByBo = new Map<string, UserEmojiMuc[]>();
  for (const row of (mucRows ?? []) as MucRow[]) {
    const list = mucByBo.get(row.id_bo) ?? [];
    list.push(mapMuc(row));
    mucByBo.set(row.id_bo, list);
  }

  const boList: UserEmojiBo[] = (boRows as BoRow[]).map((row) => {
    const items = mucByBo.get(row.id) ?? [];
    return {
      id: row.id,
      ten: row.ten,
      thuTu: row.thu_tu,
      cloudflareIdAnhBia: row.cloudflare_id_anh_bia,
      thumbnailUrl: boThumbnailUrl(row.cloudflare_id_anh_bia, items),
      items,
    };
  });

  return {
    boList,
    limits: { maxBo: MAX_USER_EMOJI_BO, maxMucPerBo: MAX_USER_EMOJI_MUC_PER_BO },
  };
}
