import "server-only";

import {
  MAX_USER_EMOJI_BO,
  MAX_USER_EMOJI_MUC_PER_BO,
} from "@/lib/user-emoji/constants";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import { probeCfImageDelivery } from "@/lib/user-emoji/probe-delivery";
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

  const mapped = ((mucRows ?? []) as MucRow[]).map(mapMuc);

  /** Gỡ meme mồ côi (id còn trong DB nhưng CF đã 404) — không xóa khi HEAD lỗi tạm. */
  const liveById = new Map<string, boolean>();
  const uniqueUrls = new Map<string, string>();
  for (const item of mapped) {
    if (!item.url || uniqueUrls.has(item.cloudflareId)) continue;
    uniqueUrls.set(item.cloudflareId, item.url);
  }
  await Promise.all(
    [...uniqueUrls.entries()].map(async ([cfId, deliveryUrl]) => {
      const status = await probeCfImageDelivery(deliveryUrl);
      if (status === "live") liveById.set(cfId, true);
      else if (status === "missing") liveById.set(cfId, false);
    }),
  );

  const orphanIds = mapped
    .filter((item) => liveById.get(item.cloudflareId) === false)
    .map((item) => item.id);

  if (orphanIds.length > 0) {
    await admin
      .from("user_emoji_muc")
      .update({ da_xoa: true })
      .in("id", orphanIds);
  }

  const mucByBo = new Map<string, UserEmojiMuc[]>();
  for (const item of mapped) {
    if (liveById.get(item.cloudflareId) === false) continue;
    const list = mucByBo.get(item.boId) ?? [];
    list.push(item);
    mucByBo.set(item.boId, list);
  }

  const boList: UserEmojiBo[] = [];
  for (const row of boRows as BoRow[]) {
    const items = mucByBo.get(row.id) ?? [];
    let coverId = row.cloudflare_id_anh_bia;
    if (coverId && liveById.get(coverId) === false) {
      coverId = items[0]?.cloudflareId ?? null;
      await admin
        .from("user_emoji_bo")
        .update({
          cloudflare_id_anh_bia: coverId,
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
    boList.push({
      id: row.id,
      ten: row.ten,
      thuTu: row.thu_tu,
      cloudflareIdAnhBia: coverId,
      thumbnailUrl: boThumbnailUrl(coverId, items),
      items,
    });
  }

  return {
    boList,
    limits: { maxBo: MAX_USER_EMOJI_BO, maxMucPerBo: MAX_USER_EMOJI_MUC_PER_BO },
  };
}
