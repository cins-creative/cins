import "server-only";

import type { GiaiDoan } from "@/lib/auth/session";
import { getAvatarUrl, getGiaiDoanLabel } from "@/lib/journey/profile";
import { getQuanHe, isFriend } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import type { ChatMessage, ChatThread, ChatThreadGroup } from "@/lib/chat/types";

const DM_ROOM = "1_1";
const MESSAGE_PAGE_SIZE = 80;

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  giai_doan: GiaiDoan | null;
};

type MessageRow = {
  id: string;
  id_phong: string;
  id_nguoi_gui: string;
  noi_dung: string | null;
  tao_luc: string;
};

type ReadRow = {
  id_phong: string;
  id_tin_nhan_cuoi_doc: string;
};

function mapMessage(row: MessageRow, viewerId: string): ChatMessage {
  return {
    id: row.id,
    from: row.id_nguoi_gui === viewerId ? "me" : "them",
    body: row.noi_dung?.trim() || "",
    sentAt: row.tao_luc,
  };
}

function buildUserThread(
  roomId: string,
  peer: ProfileRow,
  group: ChatThreadGroup,
  preview: string,
  lastAt: string,
  unread: number,
  messages: ChatMessage[] = [],
): ChatThread {
  const name = peer.ten_hien_thi?.trim() || peer.slug;
  return {
    id: roomId,
    roomId,
    peerUserId: peer.id,
    name,
    group,
    kind: "user",
    role: getGiaiDoanLabel(peer.giai_doan),
    avatarInitial: avatarInitialFromName(name),
    avatarHue: avatarHueFromSeed(peer.id),
    avatarUrl: getAvatarUrl(peer.avatar_id),
    preview,
    lastAt,
    unread,
    messages,
  };
}

async function loadAcceptedFriendIds(viewerId: string): Promise<Set<string>> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_ket_ban")
    .select("id_nguoi_gui, id_nguoi_nhan, trang_thai")
    .or(`id_nguoi_gui.eq.${viewerId},id_nguoi_nhan.eq.${viewerId}`)
    .eq("trang_thai", "accepted");

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const other =
      row.id_nguoi_gui === viewerId ? row.id_nguoi_nhan : row.id_nguoi_gui;
    if (other) ids.add(other);
  }
  return ids;
}

async function assertRoomMember(roomId: string, viewerId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle();

  if (!data) {
    throw new Error("FORBIDDEN");
  }
}

async function findDirectRoomId(
  viewerId: string,
  targetUserId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: myMemberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null);

  const roomIds = (myMemberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) return null;

  const { data: sharedRows } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, chat_phong!inner(loai_phong)")
    .eq("id_nguoi_dung", targetUserId)
    .in("id_phong", roomIds)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", DM_ROOM)
    .limit(1);

  return sharedRows?.[0]?.id_phong ?? null;
}

export async function assertCanDirectMessage(
  viewerId: string,
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!viewerId || !targetUserId) {
    return { ok: false, error: "Thiếu thông tin người dùng." };
  }
  if (viewerId === targetUserId) {
    return { ok: false, error: "Không thể nhắn tin cho chính mình." };
  }

  const admin = createServiceRoleClient();
  const { data: target } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "Không tìm thấy người dùng." };
  }

  const quanHe = await getQuanHe(viewerId, targetUserId);
  if (quanHe === "blocked") {
    return { ok: false, error: "Không thể nhắn tin với người này." };
  }

  return { ok: true };
}

export async function openDirectRoom(
  viewerId: string,
  targetUserId: string,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const allowed = await assertCanDirectMessage(viewerId, targetUserId);
  if (!allowed.ok) return allowed;

  const admin = createServiceRoleClient();
  let roomId = await findDirectRoomId(viewerId, targetUserId);

  if (!roomId) {
    const { data: room, error: roomError } = await admin
      .from("chat_phong")
      .insert({ loai_phong: DM_ROOM })
      .select("id")
      .single<{ id: string }>();

    if (roomError || !room) {
      return { ok: false, error: "Không tạo được phòng chat." };
    }

    roomId = room.id;
    const { error: memberError } = await admin.from("chat_thanh_vien").insert([
      { id_phong: roomId, id_nguoi_dung: viewerId },
      { id_phong: roomId, id_nguoi_dung: targetUserId },
    ]);

    if (memberError) {
      return { ok: false, error: "Không thêm thành viên phòng chat." };
    }
  }

  const thread = await getDirectThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải được hội thoại." };
  }

  return {
    ok: true,
    thread: {
      ...thread,
      messages: [],
    },
  };
}

async function getDirectThread(
  roomId: string,
  viewerId: string,
): Promise<ChatThread | null> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong, cap_nhat_luc")
    .eq("id", roomId)
    .eq("loai_phong", DM_ROOM)
    .maybeSingle<{ id: string; loai_phong: string; cap_nhat_luc: string }>();

  if (!room) return null;

  const { data: members } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null);

  const peerId = (members ?? [])
    .map((row) => row.id_nguoi_dung)
    .find((id) => id !== viewerId);

  if (!peerId) return null;

  const { data: peer } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .eq("id", peerId)
    .maybeSingle<ProfileRow>();

  if (!peer) return null;

  const friend = await isFriend(viewerId, peerId);
  const group: ChatThreadGroup = friend ? "ban_be" : "nguoi_la";

  const { data: lastMessage } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong, id_nguoi_gui, noi_dung, tao_luc")
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<MessageRow>();

  const unread = await countUnreadInRoom(roomId, viewerId);

  return buildUserThread(
    roomId,
    peer,
    group,
    lastMessage?.noi_dung?.trim() || "Bắt đầu trò chuyện",
    lastMessage?.tao_luc ?? room.cap_nhat_luc,
    unread,
  );
}

async function countUnreadInRoom(roomId: string, viewerId: string): Promise<number> {
  const admin = createServiceRoleClient();

  const { data: readState } = await admin
    .from("chat_da_doc")
    .select("id_tin_nhan_cuoi_doc")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .maybeSingle<Pick<ReadRow, "id_tin_nhan_cuoi_doc">>();

  let readAt: string | null = null;
  if (readState?.id_tin_nhan_cuoi_doc) {
    const { data: readMessage } = await admin
      .from("chat_tin_nhan")
      .select("tao_luc")
      .eq("id", readState.id_tin_nhan_cuoi_doc)
      .maybeSingle<{ tao_luc: string }>();
    readAt = readMessage?.tao_luc ?? null;
  }

  let query = admin
    .from("chat_tin_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .neq("id_nguoi_gui", viewerId);

  if (readAt) {
    query = query.gt("tao_luc", readAt);
  }

  const { count } = await query;
  return count ?? 0;
}

function countUnreadForRoom(
  roomId: string,
  viewerId: string,
  messages: MessageRow[],
  readAt: string | null,
): number {
  return messages.filter(
    (msg) =>
      msg.id_phong === roomId &&
      msg.id_nguoi_gui !== viewerId &&
      (!readAt || msg.tao_luc > readAt),
  ).length;
}

export async function listDirectThreads(viewerId: string): Promise<ChatThread[]> {
  const admin = createServiceRoleClient();
  const friendIds = await loadAcceptedFriendIds(viewerId);

  const { data: memberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, chat_phong!inner(id, loai_phong, cap_nhat_luc)")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", DM_ROOM);

  const roomIds = (memberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) return [];

  const { data: allMembers } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, id_nguoi_dung")
    .in("id_phong", roomIds)
    .is("roi_luc", null);

  const peerByRoom = new Map<string, string>();
  for (const row of allMembers ?? []) {
    if (row.id_nguoi_dung === viewerId) continue;
    peerByRoom.set(row.id_phong, row.id_nguoi_dung);
  }

  const peerIds = [...new Set(peerByRoom.values())];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .in("id", peerIds)
    .returns<ProfileRow[]>();

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: messages } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong, id_nguoi_gui, noi_dung, tao_luc")
    .in("id_phong", roomIds)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false });

  const lastByRoom = new Map<string, MessageRow>();
  for (const msg of messages ?? []) {
    if (!lastByRoom.has(msg.id_phong)) {
      lastByRoom.set(msg.id_phong, msg);
    }
  }

  const { data: reads } = await admin
    .from("chat_da_doc")
    .select("id_phong, id_tin_nhan_cuoi_doc")
    .eq("id_nguoi_dung", viewerId)
    .in("id_phong", roomIds)
    .returns<ReadRow[]>();

  const readMessageIds = [...new Set((reads ?? []).map((r) => r.id_tin_nhan_cuoi_doc))];
  const readAtByRoom = new Map<string, string>();

  if (readMessageIds.length > 0) {
    const { data: readMessages } = await admin
      .from("chat_tin_nhan")
      .select("id, tao_luc")
      .in("id", readMessageIds)
      .returns<Array<{ id: string; tao_luc: string }>>();

    const readAtByMessageId = new Map(
      (readMessages ?? []).map((row) => [row.id, row.tao_luc]),
    );

    for (const read of reads ?? []) {
      const readAt = readAtByMessageId.get(read.id_tin_nhan_cuoi_doc);
      if (readAt) readAtByRoom.set(read.id_phong, readAt);
    }
  }

  const roomUpdatedAt = new Map<string, string>();
  for (const row of memberships ?? []) {
    const room = row.chat_phong as { cap_nhat_luc?: string } | null;
    roomUpdatedAt.set(row.id_phong, room?.cap_nhat_luc ?? new Date(0).toISOString());
  }

  const threads: ChatThread[] = [];
  for (const roomId of roomIds) {
    const peerId = peerByRoom.get(roomId);
    const peer = peerId ? profileById.get(peerId) : null;
    if (!peer || !peerId) continue;

    const last = lastByRoom.get(roomId);
    const group: ChatThreadGroup = friendIds.has(peerId) ? "ban_be" : "nguoi_la";
    const readAt = readAtByRoom.get(roomId) ?? null;

    threads.push(
      buildUserThread(
        roomId,
        peer,
        group,
        last?.noi_dung?.trim() || "Bắt đầu trò chuyện",
        last?.tao_luc ?? roomUpdatedAt.get(roomId) ?? new Date().toISOString(),
        countUnreadForRoom(roomId, viewerId, messages ?? [], readAt),
      ),
    );
  }

  threads.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  return threads;
}

export async function listRoomMessages(
  roomId: string,
  viewerId: string,
): Promise<ChatMessage[]> {
  await assertRoomMember(roomId, viewerId);
  const admin = createServiceRoleClient();

  const { data, error } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong, id_nguoi_gui, noi_dung, tao_luc")
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: true })
    .limit(MESSAGE_PAGE_SIZE)
    .returns<MessageRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const messages = (data ?? []).map((row) => mapMessage(row, viewerId));
  const last = messages.at(-1);
  if (last) {
    await markRoomRead(roomId, viewerId, last.id);
  }

  return messages;
}

export async function sendRoomMessage(
  roomId: string,
  viewerId: string,
  body: string,
): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
  const text = body.trim();
  if (!text) {
    return { ok: false, error: "Tin nhắn trống." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền gửi tin." };
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("chat_tin_nhan")
    .insert({
      id_phong: roomId,
      id_nguoi_gui: viewerId,
      noi_dung: text,
      loai_tin: "text",
    })
    .select("id, id_phong, id_nguoi_gui, noi_dung, tao_luc")
    .single<MessageRow>();

  if (error || !data) {
    return { ok: false, error: "Không gửi được tin nhắn." };
  }

  await admin.from("chat_phong").update({ cap_nhat_luc: now }).eq("id", roomId);
  await markRoomRead(roomId, viewerId, data.id);

  return { ok: true, message: mapMessage(data, viewerId) };
}

export async function markRoomRead(
  roomId: string,
  viewerId: string,
  lastMessageId?: string,
): Promise<void> {
  await assertRoomMember(roomId, viewerId);
  const admin = createServiceRoleClient();

  let messageId = lastMessageId;
  if (!messageId) {
    const { data: last } = await admin
      .from("chat_tin_nhan")
      .select("id")
      .eq("id_phong", roomId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    messageId = last?.id;
  }

  if (!messageId) return;

  await admin.from("chat_da_doc").upsert(
    {
      id_phong: roomId,
      id_nguoi_dung: viewerId,
      id_tin_nhan_cuoi_doc: messageId,
      cap_nhat_luc: new Date().toISOString(),
    },
    { onConflict: "id_phong,id_nguoi_dung" },
  );
}

export async function countTotalUnread(viewerId: string): Promise<number> {
  const threads = await listDirectThreads(viewerId);
  return threads.reduce((sum, thread) => sum + thread.unread, 0);
}
