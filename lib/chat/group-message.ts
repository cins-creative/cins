import "server-only";

import type { GiaiDoan } from "@/lib/auth/session";
import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import { isCloudflareImageId } from "@/lib/chat/image-url";
import {
  assertRoomMember,
  countUnreadInRoom,
  MESSAGE_SELECT,
  messagePreview,
  type MessageRow,
} from "@/lib/chat/direct-message";
import { getAvatarUrl, getGiaiDoanLabel } from "@/lib/journey/profile";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { ChatGroupMemberAvatar, ChatMessage, ChatThread } from "@/lib/chat/types";

export const GROUP_ROOM = "nhom";

const MIN_GROUP_MEMBERS = 2;
const MAX_GROUP_MEMBERS = 20;

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  giai_doan: GiaiDoan | null;
};

type RoomRow = {
  id: string;
  loai_phong: string;
  ten_phong: string | null;
  avatar_id: string | null;
  cap_nhat_luc: string;
};

export function buildGroupDisplayName(
  members: ProfileRow[],
  viewerId: string,
  tenPhong?: string | null,
): string {
  const custom = tenPhong?.trim();
  if (custom) return custom;

  const others = members
    .filter((m) => m.id !== viewerId)
    .map((m) => m.ten_hien_thi?.trim() || m.slug)
    .filter(Boolean);

  if (others.length === 0) return "Nhóm chat";
  if (others.length <= 3) return others.join(", ");
  return `${others.slice(0, 2).join(", ")} +${others.length - 2}`;
}

function buildMemberAvatars(
  members: ProfileRow[],
  viewerId: string,
): ChatGroupMemberAvatar[] {
  const sorted = [...members].sort((a, b) => {
    if (a.id === viewerId) return 1;
    if (b.id === viewerId) return -1;
    return (a.ten_hien_thi?.trim() || a.slug).localeCompare(
      b.ten_hien_thi?.trim() || b.slug,
      "vi",
    );
  });

  return sorted.map((member) => {
    const name = member.ten_hien_thi?.trim() || member.slug;
    return {
      userId: member.id,
      initial: avatarInitialFromName(name),
      hue: avatarHueFromSeed(member.id),
      avatarUrl: getAvatarUrl(member.avatar_id),
    };
  });
}

function buildGroupThread(
  room: RoomRow,
  members: ProfileRow[],
  viewerId: string,
  preview: string,
  lastAt: string,
  unread: number,
  isGroupAdmin = false,
): ChatThread {
  const name = buildGroupDisplayName(members, viewerId, room.ten_phong);
  const memberIds = members.map((m) => m.id);

  return {
    id: room.id,
    roomId: room.id,
    name,
    group: "ban_be",
    kind: "user",
    isGroup: true,
    memberCount: members.length,
    memberIds,
    memberAvatars: buildMemberAvatars(members, viewerId),
    isGroupAdmin,
    role: `${members.length} thành viên`,
    avatarInitial: avatarInitialFromName(name),
    avatarHue: avatarHueFromSeed(room.id),
    avatarUrl: getAvatarUrl(room.avatar_id),
    preview,
    lastAt,
    unread,
    messages: [],
  };
}

async function loadProfiles(userIds: string[]): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) return new Map();
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .in("id", userIds)
    .returns<ProfileRow[]>();

  return new Map((data ?? []).map((row) => [row.id, row]));
}

export async function assertCanCreateGroup(
  viewerId: string,
  memberIds: string[],
): Promise<{ ok: true; uniqueIds: string[] } | { ok: false; error: string }> {
  const uniqueIds = [...new Set(memberIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => id !== viewerId,
  );

  if (uniqueIds.length < MIN_GROUP_MEMBERS) {
    return {
      ok: false,
      error: `Chọn ít nhất ${MIN_GROUP_MEMBERS} bạn bè để tạo nhóm.`,
    };
  }

  if (uniqueIds.length > MAX_GROUP_MEMBERS - 1) {
    return {
      ok: false,
      error: `Nhóm tối đa ${MAX_GROUP_MEMBERS} người.`,
    };
  }

  const friendIds = new Set(await listFriends(viewerId));
  for (const id of uniqueIds) {
    if (!friendIds.has(id)) {
      return { ok: false, error: "Chỉ có thể thêm bạn bè vào nhóm." };
    }
    const allowed = await assertCanDirectMessage(viewerId, id);
    if (!allowed.ok) return allowed;
  }

  return { ok: true, uniqueIds };
}

export async function createGroupRoom(
  viewerId: string,
  memberIds: string[],
  tenPhong?: string | null,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const check = await assertCanCreateGroup(viewerId, memberIds);
  if (!check.ok) return check;

  const admin = createServiceRoleClient();
  const trimmedName = tenPhong?.trim() || null;

  const { data: room, error: roomError } = await admin
    .from("chat_phong")
    .insert({
      loai_phong: GROUP_ROOM,
      ten_phong: trimmedName,
      loai_context: "ban_be",
    })
    .select("id, loai_phong, ten_phong, avatar_id, cap_nhat_luc")
    .single<RoomRow>();

  if (roomError || !room?.id) {
    return { ok: false, error: "Không tạo được nhóm chat." };
  }

  const allMemberIds = [viewerId, ...check.uniqueIds];
  const memberRows = allMemberIds.map((id) => ({
    id_phong: room.id,
    id_nguoi_dung: id,
    vai_tro: id === viewerId ? ("admin" as const) : ("thanh_vien" as const),
  }));

  const { error: memberError } = await admin.from("chat_thanh_vien").insert(memberRows);
  if (memberError) {
    await admin.from("chat_phong").delete().eq("id", room.id);
    return { ok: false, error: "Không thêm được thành viên nhóm." };
  }

  const profiles = await loadProfiles(allMemberIds);
  const members = allMemberIds
    .map((id) => profiles.get(id))
    .filter(Boolean) as ProfileRow[];

  const thread = buildGroupThread(
    room,
    members,
    viewerId,
    "Nhóm mới được tạo",
    room.cap_nhat_luc,
    0,
    true,
  );

  return { ok: true, thread };
}

export async function getGroupThread(
  roomId: string,
  viewerId: string,
): Promise<ChatThread | null> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong, ten_phong, avatar_id, cap_nhat_luc")
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<RoomRow>();

  if (!room) return null;

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return null;
  }

  const { data: myMembership } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  const { data: memberRows } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null);

  const memberIds = (memberRows ?? []).map((row) => row.id_nguoi_dung);
  const profiles = await loadProfiles(memberIds);
  const members = memberIds
    .map((id) => profiles.get(id))
    .filter(Boolean) as ProfileRow[];

  const { data: lastMessage } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<MessageRow>();

  const unread = await countUnreadInRoom(roomId, viewerId);

  return buildGroupThread(
    room,
    members,
    viewerId,
    lastMessage ? messagePreview(lastMessage) : "Bắt đầu trò chuyện",
    lastMessage?.tao_luc ?? room.cap_nhat_luc,
    unread,
    myMembership?.vai_tro === "admin",
  );
}

export async function listGroupThreads(viewerId: string): Promise<ChatThread[]> {
  const admin = createServiceRoleClient();

  const { data: memberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, vai_tro, chat_phong!inner(id, loai_phong, ten_phong, avatar_id, cap_nhat_luc)")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", GROUP_ROOM);

  const roomIds = (memberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) return [];

  const { data: allMembers } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, id_nguoi_dung")
    .in("id_phong", roomIds)
    .is("roi_luc", null);

  const membersByRoom = new Map<string, string[]>();
  for (const row of allMembers ?? []) {
    const list = membersByRoom.get(row.id_phong) ?? [];
    list.push(row.id_nguoi_dung);
    membersByRoom.set(row.id_phong, list);
  }

  const allUserIds = [...new Set((allMembers ?? []).map((row) => row.id_nguoi_dung))];
  const profiles = await loadProfiles(allUserIds);

  const { data: messages } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
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
    .in("id_phong", roomIds);

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

  const threads: ChatThread[] = [];

  for (const row of memberships ?? []) {
    const room = row.chat_phong as RoomRow | null;
    if (!room?.id) continue;

    const memberIds = membersByRoom.get(room.id) ?? [];
    const members = memberIds
      .map((id) => profiles.get(id))
      .filter(Boolean) as ProfileRow[];

    const last = lastByRoom.get(room.id);
    const readAt = readAtByRoom.get(room.id) ?? null;
    const unread = (messages ?? []).filter(
      (msg) =>
        msg.id_phong === room.id &&
        msg.id_nguoi_gui !== viewerId &&
        (!readAt || msg.tao_luc > readAt),
    ).length;

    threads.push(
      buildGroupThread(
        room,
        members,
        viewerId,
        last ? messagePreview(last) : "Bắt đầu trò chuyện",
        last?.tao_luc ?? room.cap_nhat_luc,
        unread,
        row.vai_tro === "admin",
      ),
    );
  }

  threads.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  return threads;
}

export async function enrichGroupMessageSenders(
  messages: ChatMessage[],
  rows: MessageRow[],
): Promise<ChatMessage[]> {
  const senderIds = [...new Set(rows.map((row) => row.id_nguoi_gui))];
  const profiles = await loadProfiles(senderIds);

  const rowById = new Map(rows.map((row) => [row.id, row]));

  return messages.map((msg) => {
    const row = rowById.get(msg.id);
    if (!row || msg.from === "me") return msg;

    const profile = profiles.get(row.id_nguoi_gui);
    if (!profile) return msg;

    const name = profile.ten_hien_thi?.trim() || profile.slug;
    return {
      ...msg,
      senderUserId: profile.id,
      senderName: name,
      senderAvatarInitial: avatarInitialFromName(name),
      senderAvatarHue: avatarHueFromSeed(profile.id),
      senderAvatarUrl: getAvatarUrl(profile.avatar_id),
      senderRole: getGiaiDoanLabel(profile.giai_doan),
    };
  });
}

export async function isGroupRoomId(roomId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_phong")
    .select("loai_phong")
    .eq("id", roomId)
    .maybeSingle<{ loai_phong: string }>();

  return data?.loai_phong === GROUP_ROOM;
}

export async function updateGroupRoomAvatar(
  roomId: string,
  viewerId: string,
  avatarId: string | null,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong")
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<{ id: string; loai_phong: string }>();

  if (!room?.id) {
    return { ok: false, error: "Không tìm thấy nhóm chat." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (membership?.vai_tro !== "admin") {
    return { ok: false, error: "Chỉ admin nhóm mới đổi được ảnh." };
  }

  const trimmed = avatarId?.trim() || null;
  if (trimmed && !isCloudflareImageId(trimmed)) {
    return { ok: false, error: "Ảnh không hợp lệ." };
  }

  const { error } = await admin
    .from("chat_phong")
    .update({ avatar_id: trimmed })
    .eq("id", roomId);

  if (error) {
    return { ok: false, error: "Không lưu được ảnh nhóm." };
  }

  const thread = await getGroupThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải lại được nhóm." };
  }

  return { ok: true, thread };
}

export async function leaveGroupRoom(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong")
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<{ id: string; loai_phong: string }>();

  if (!room?.id) {
    return { ok: false, error: "Không tìm thấy nhóm chat." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("id, vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ id: string; vai_tro: string }>();

  if (!membership?.id) {
    return { ok: false, error: "Bạn không còn trong nhóm." };
  }

  const now = new Date().toISOString();
  const { error: leaveError } = await admin
    .from("chat_thanh_vien")
    .update({ roi_luc: now })
    .eq("id", membership.id);

  if (leaveError) {
    return { ok: false, error: "Không rời được nhóm." };
  }

  if (membership.vai_tro === "admin") {
    const { data: successor } = await admin
      .from("chat_thanh_vien")
      .select("id")
      .eq("id_phong", roomId)
      .is("roi_luc", null)
      .neq("id_nguoi_dung", viewerId)
      .order("tham_gia_luc", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (successor?.id) {
      await admin
        .from("chat_thanh_vien")
        .update({ vai_tro: "admin" })
        .eq("id", successor.id);
    }
  }

  return { ok: true };
}

export async function deleteGroupRoom(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong")
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<{ id: string; loai_phong: string }>();

  if (!room?.id) {
    return { ok: false, error: "Không tìm thấy nhóm chat." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (membership?.vai_tro !== "admin") {
    return { ok: false, error: "Chỉ admin nhóm mới xóa được nhóm." };
  }

  const { error } = await admin.from("chat_phong").delete().eq("id", roomId);

  if (error) {
    return { ok: false, error: "Không xóa được nhóm chat." };
  }

  return { ok: true };
}
