import "server-only";

import { MAX_ROOM_RESOURCE_TAGS } from "@/lib/chat/constants";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { pickRoomTagColor } from "@/lib/chat/tag-colors";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ChatRoomTag = {
  id: string;
  roomId: string;
  ten: string;
  slug: string;
  mau: string | null;
  thuTu: number;
};

function slugifyTagName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "the";
}

async function uniqueTagSlug(roomId: string, baseSlug: string): Promise<string> {
  const admin = createServiceRoleClient();
  let candidate = baseSlug.slice(0, 48);
  let n = 2;
  while (n < 100) {
    const { data } = await admin
      .from("chat_the_tai_nguyen")
      .select("id")
      .eq("id_phong", roomId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    const suffix = `-${n}`;
    candidate = baseSlug.slice(0, 48 - suffix.length) + suffix;
    n += 1;
  }
  return `${baseSlug.slice(0, 40)}-${Date.now().toString(36)}`;
}

function mapTag(row: {
  id: string;
  id_phong: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
}): ChatRoomTag {
  return {
    id: row.id,
    roomId: row.id_phong,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
    thuTu: row.thu_tu,
  };
}

export async function listRoomTags(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true; tags: ChatRoomTag[] } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_the_tai_nguyen")
    .select("id, id_phong, ten, slug, mau, thu_tu")
    .eq("id_phong", roomId)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });

  if (error) {
    return { ok: false, error: "Không tải được thẻ." };
  }

  return {
    ok: true,
    tags: (data ?? []).map(mapTag),
  };
}

export async function createRoomTag(
  roomId: string,
  viewerId: string,
  ten: string,
  mau?: string | null,
): Promise<{ ok: true; tag: ChatRoomTag } | { ok: false; error: string }> {
  const name = ten.trim();
  if (!name) return { ok: false, error: "Nhập tên thẻ." };
  if (name.length > 40) return { ok: false, error: "Tên thẻ tối đa 40 ký tự." };

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("chat_the_tai_nguyen")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId);

  if ((count ?? 0) >= MAX_ROOM_RESOURCE_TAGS) {
    return { ok: false, error: `Tối đa ${MAX_ROOM_RESOURCE_TAGS} thẻ mỗi phòng.` };
  }

  const slug = await uniqueTagSlug(roomId, slugifyTagName(name));
  const explicit = mau?.trim() || null;
  let color = explicit;
  if (!color) {
    const { data: existing } = await admin
      .from("chat_the_tai_nguyen")
      .select("mau")
      .eq("id_phong", roomId);
    color = pickRoomTagColor((existing ?? []).map((row) => row.mau));
  }

  const { data, error } = await admin
    .from("chat_the_tai_nguyen")
    .insert({
      id_phong: roomId,
      ten: name,
      slug,
      mau: color,
      thu_tu: count ?? 0,
      id_nguoi_tao: viewerId,
    })
    .select("id, id_phong, ten, slug, mau, thu_tu")
    .single();

  if (error || !data) {
    return { ok: false, error: "Không tạo được thẻ." };
  }

  return { ok: true, tag: mapTag(data) };
}

export async function deleteRoomTag(
  roomId: string,
  tagId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: tag } = await admin
    .from("chat_the_tai_nguyen")
    .select("id")
    .eq("id", tagId)
    .eq("id_phong", roomId)
    .maybeSingle();

  if (!tag) return { ok: false, error: "Không tìm thấy thẻ." };

  const { error } = await admin.from("chat_the_tai_nguyen").delete().eq("id", tagId);
  if (error) return { ok: false, error: "Không xóa được thẻ." };
  return { ok: true };
}

export async function setMessageTags(
  roomId: string,
  messageId: string,
  viewerId: string,
  tagIds: string[],
): Promise<{ ok: true; tagIds: string[] } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();

  const { data: message } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong")
    .eq("id", messageId)
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string; id_phong: string }>();

  if (!message) return { ok: false, error: "Không tìm thấy tin nhắn." };

  const uniqueTagIds = [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueTagIds.length > 0) {
    const { data: tags } = await admin
      .from("chat_the_tai_nguyen")
      .select("id")
      .eq("id_phong", roomId)
      .in("id", uniqueTagIds);

    if ((tags ?? []).length !== uniqueTagIds.length) {
      return { ok: false, error: "Có thẻ không thuộc phòng này." };
    }
  }

  await admin.from("chat_the_gan").delete().eq("id_tin_nhan", messageId);

  if (uniqueTagIds.length > 0) {
    const { error } = await admin.from("chat_the_gan").insert(
      uniqueTagIds.map((id_the) => ({
        id_the,
        id_tin_nhan: messageId,
        id_nguoi_gan: viewerId,
      })),
    );
    if (error) return { ok: false, error: "Không gắn được thẻ." };
  }

  return { ok: true, tagIds: uniqueTagIds };
}

export type ChatRoomResourceItem = {
  messageId: string;
  body: string;
  sentAt: string;
  imageUrl: string | null;
  urls: string[];
  tagIds: string[];
};

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,;:!?)]+$/, "")))];
}

export async function listRoomResources(
  roomId: string,
  viewerId: string,
  filterTagId?: string | null,
): Promise<
  | { ok: true; items: ChatRoomResourceItem[]; tags: ChatRoomTag[] }
  | { ok: false; error: string }
> {
  const tagsResult = await listRoomTags(roomId, viewerId);
  if (!tagsResult.ok) return tagsResult;

  const admin = createServiceRoleClient();
  const { data: messages, error } = await admin
    .from("chat_tin_nhan")
    .select("id, noi_dung, loai_tin, tao_luc, id_dinh_kem, content_media(cloudflare_id)")
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(200);

  if (error) {
    return { ok: false, error: "Không tải được tài nguyên." };
  }

  const messageIds = (messages ?? []).map((m) => m.id);
  const tagIdsByMessage = new Map<string, string[]>();

  if (messageIds.length > 0) {
    const { data: gans } = await admin
      .from("chat_the_gan")
      .select("id_tin_nhan, id_the")
      .in("id_tin_nhan", messageIds);

    for (const gan of gans ?? []) {
      const list = tagIdsByMessage.get(gan.id_tin_nhan) ?? [];
      list.push(gan.id_the);
      tagIdsByMessage.set(gan.id_tin_nhan, list);
    }
  }

  const { chatImageDeliveryUrl } = await import("@/lib/chat/image-url");

  const items: ChatRoomResourceItem[] = [];
  for (const row of messages ?? []) {
    // Meme/sticker không phải tài nguyên ảnh trong workspace.
    if (row.loai_tin === "sticker") continue;

    const body = typeof row.noi_dung === "string" ? row.noi_dung : "";
    const urls = extractUrlsFromText(body);
    const media = row.content_media;
    const mediaRow = Array.isArray(media) ? media[0] : media;
    const cfId =
      mediaRow && typeof mediaRow === "object" && "cloudflare_id" in mediaRow
        ? (mediaRow as { cloudflare_id: string | null }).cloudflare_id
        : null;
    const imageUrl = cfId ? chatImageDeliveryUrl(cfId) : null;

    if (!imageUrl && urls.length === 0) continue;

    const tagIds = tagIdsByMessage.get(row.id) ?? [];
    if (filterTagId && !tagIds.includes(filterTagId)) continue;

    items.push({
      messageId: row.id,
      body: body.trim(),
      sentAt: row.tao_luc,
      imageUrl,
      urls,
      tagIds,
    });
  }

  return { ok: true, items, tags: tagsResult.tags };
}
