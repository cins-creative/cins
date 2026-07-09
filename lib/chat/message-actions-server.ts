import "server-only";

import { CHAT_ACTION_WINDOW_MS, CHAT_PIN_LIMIT, CHAT_REACTION_EMOJIS } from "@/lib/chat/constants";
import {
  assertRoomMember,
  fetchMessageById,
  mapMessageFromRow,
  MESSAGE_SELECT,
  type MessageRow,
} from "@/lib/chat/direct-message";
import {
  assertPinLimit,
  loadReactionsForMessages,
  SOCIAL_LOAI_CHAT_TIN_NHAN,
} from "@/lib/chat/message-enrich";
import type { ChatReactionSummary } from "@/lib/chat/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function withinActionWindow(sentAt: string): boolean {
  return Date.now() - new Date(sentAt).getTime() <= CHAT_ACTION_WINDOW_MS;
}

export async function recallRoomMessage(
  roomId: string,
  viewerId: string,
  messageId: string,
): Promise<{ ok: true; message: ReturnType<typeof mapMessageFromRow> } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: row, error: fetchErr } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id", messageId)
    .eq("id_phong", roomId)
    .maybeSingle<MessageRow>();

  if (fetchErr || !row) {
    return { ok: false, error: "Không tìm thấy tin nhắn." };
  }

  if (row.id_nguoi_gui !== viewerId) {
    return { ok: false, error: "Chỉ thu hồi được tin của bạn." };
  }

  if (row.da_xoa) {
    return { ok: false, error: "Tin đã được thu hồi." };
  }

  if (!withinActionWindow(row.tao_luc)) {
    return { ok: false, error: "Đã quá thời gian thu hồi (15 phút)." };
  }

  const { data: updated, error } = await admin
    .from("chat_tin_nhan")
    .update({ da_xoa: true })
    .eq("id", messageId)
    .select(MESSAGE_SELECT)
    .single<MessageRow>();

  if (error || !updated) {
    return { ok: false, error: "Không thu hồi được tin nhắn." };
  }

  const reactions = await loadReactionsForMessages([messageId], viewerId);
  return {
    ok: true,
    message: mapMessageFromRow(updated, viewerId, {
      reactions: reactions.get(messageId),
    }),
  };
}

export async function editRoomMessage(
  roomId: string,
  viewerId: string,
  messageId: string,
  newBody: string,
): Promise<{ ok: true; message: ReturnType<typeof mapMessageFromRow> } | { ok: false; error: string }> {
  const body = newBody.trim();
  if (!body) {
    return { ok: false, error: "Nội dung không được trống." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id", messageId)
    .eq("id_phong", roomId)
    .maybeSingle<MessageRow>();

  if (!row) {
    return { ok: false, error: "Không tìm thấy tin nhắn." };
  }

  if (row.id_nguoi_gui !== viewerId) {
    return { ok: false, error: "Chỉ sửa được tin của bạn." };
  }

  if (row.da_xoa) {
    return { ok: false, error: "Không sửa được tin đã thu hồi." };
  }

  if (row.loai_tin === "media" || row.loai_tin === "sticker") {
    return { ok: false, error: "Không sửa được tin ảnh hoặc meme." };
  }

  if (!withinActionWindow(row.tao_luc)) {
    return { ok: false, error: "Đã quá thời gian sửa (15 phút)." };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("chat_tin_nhan")
    .update({ noi_dung: body, da_sua: true, sua_luc: now })
    .eq("id", messageId)
    .select(MESSAGE_SELECT)
    .single<MessageRow>();

  if (error || !updated) {
    return { ok: false, error: "Không sửa được tin nhắn." };
  }

  const message = await fetchMessageById(messageId, viewerId);
  if (!message) {
    return { ok: false, error: "Không tải lại được tin nhắn." };
  }

  return { ok: true, message };
}

export async function setMessagePinned(
  roomId: string,
  viewerId: string,
  messageId: string,
  pinned: boolean,
): Promise<{ ok: true; pinned: boolean } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();

  const { data: row } = await admin
    .from("chat_tin_nhan")
    .select("id, da_xoa")
    .eq("id", messageId)
    .eq("id_phong", roomId)
    .maybeSingle<{ id: string; da_xoa: boolean }>();

  if (!row || row.da_xoa) {
    return { ok: false, error: "Không ghim được tin này." };
  }

  if (pinned) {
    try {
      await assertPinLimit(roomId);
    } catch {
      return { ok: false, error: `Tối đa ${CHAT_PIN_LIMIT} tin ghim mỗi phòng.` };
    }

    const { error } = await admin.from("chat_ghim").upsert(
      {
        id_phong: roomId,
        id_tin_nhan: messageId,
        id_nguoi_ghim: viewerId,
        ghim_luc: new Date().toISOString(),
      },
      { onConflict: "id_phong,id_tin_nhan" },
    );

    if (error) {
      return { ok: false, error: "Không ghim được tin nhắn." };
    }
  } else {
    await admin
      .from("chat_ghim")
      .delete()
      .eq("id_phong", roomId)
      .eq("id_tin_nhan", messageId);
  }

  return { ok: true, pinned };
}

export async function toggleChatMessageReaction(
  roomId: string,
  viewerId: string,
  messageId: string,
  emoji: string,
  active: boolean,
): Promise<
  { ok: true; reactions: ChatReactionSummary[] } | { ok: false; error: string }
> {
  if (!CHAT_REACTION_EMOJIS.includes(emoji as (typeof CHAT_REACTION_EMOJIS)[number])) {
    return { ok: false, error: "Reaction không hợp lệ." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("chat_tin_nhan")
    .select("id, da_xoa")
    .eq("id", messageId)
    .eq("id_phong", roomId)
    .maybeSingle<{ id: string; da_xoa: boolean }>();

  if (!row || row.da_xoa) {
    return { ok: false, error: "Không reaction được tin này." };
  }

  if (active) {
    const { error } = await admin.from("social_reaction").upsert(
      {
        id_nguoi_dung: viewerId,
        loai_doi_tuong: SOCIAL_LOAI_CHAT_TIN_NHAN,
        id_doi_tuong: messageId,
        emoji,
      },
      { onConflict: "id_nguoi_dung,loai_doi_tuong,id_doi_tuong,emoji" },
    );
    if (error) {
      return { ok: false, error: "Không thêm được reaction." };
    }
  } else {
    await admin
      .from("social_reaction")
      .delete()
      .eq("id_nguoi_dung", viewerId)
      .eq("loai_doi_tuong", SOCIAL_LOAI_CHAT_TIN_NHAN)
      .eq("id_doi_tuong", messageId)
      .eq("emoji", emoji);
  }

  const reactions = await loadReactionsForMessages([messageId], viewerId);
  return { ok: true, reactions: reactions.get(messageId) ?? [] };
}

export async function listPinnedRoomMessages(
  roomId: string,
  viewerId: string,
): Promise<ReturnType<typeof mapMessageFromRow>[]> {
  await assertRoomMember(roomId, viewerId);
  const admin = createServiceRoleClient();

  const { data: pins } = await admin
    .from("chat_ghim")
    .select("id_tin_nhan, ghim_luc")
    .eq("id_phong", roomId)
    .order("ghim_luc", { ascending: false });

  const ids = (pins ?? []).map((p) => p.id_tin_nhan as string);
  if (ids.length === 0) return [];

  const { data: rows } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .in("id", ids)
    .eq("da_xoa", false);

  const reactions = await loadReactionsForMessages(ids, viewerId);
  const byId = new Map(
    (rows ?? []).map((row) => [
      row.id,
      mapMessageFromRow(row as MessageRow, viewerId, {
        reactions: reactions.get(row.id),
        pinned: true,
      }),
    ]),
  );

  return ids.map((id) => byId.get(id)).filter(Boolean) as ReturnType<
    typeof mapMessageFromRow
  >[];
}
