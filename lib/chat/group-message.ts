import "server-only";

import type { GiaiDoan } from "@/lib/auth/session";
import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import {
  MAX_GROUP_MEMBERS,
  MIN_GROUP_MEMBERS_SELECTED,
} from "@/lib/chat/constants";
import {
  canDeleteGroupChat,
  canKickGroupMember,
  canManageGroupChat,
  canManageGroupRoles,
  compareGroupVaiTro,
  normalizeGroupVaiTro,
} from "@/lib/chat/group-roles";
import { isCloudflareImageId } from "@/lib/chat/image-url";
import {
  assertCanDirectMessage,
  assertRoomMember,
  countUnreadInRoom,
  MESSAGE_SELECT,
  messagePreview,
  type MessageRow,
} from "@/lib/chat/direct-message";
import { getAvatarUrl, getGiaiDoanLabel } from "@/lib/journey/profile";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  ChatGroupMember,
  ChatGroupMemberAvatar,
  ChatGroupVaiTro,
  ChatMessage,
  ChatThread,
} from "@/lib/chat/types";

export const GROUP_ROOM = "nhom";

type MembershipRow = {
  id: string;
  id_nguoi_dung: string;
  vai_tro: string;
  tham_gia_luc?: string | null;
};

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
  id_phong_cha?: string | null;
  trang_thai?: string | null;
};

/** Cột luôn có — list nhóm không phụ thuộc migration L28. */
const ROOM_SELECT_BASE =
  "id, loai_phong, ten_phong, avatar_id, cap_nhat_luc";

/** Thêm project/ẩn — chỉ dùng khi DB đã chạy migration_chat_project_workspace. */
const ROOM_SELECT_WORKSPACE = `${ROOM_SELECT_BASE}, id_phong_cha, trang_thai`;

function isMissingWorkspaceColumnError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("id_phong_cha") ||
    m.includes("trang_thai") ||
    m.includes("does not exist") ||
    m.includes("schema cache")
  );
}

async function selectGroupRoomById(
  roomId: string,
): Promise<RoomRow | null> {
  const admin = createServiceRoleClient();
  const full = await admin
    .from("chat_phong")
    .select(ROOM_SELECT_WORKSPACE)
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<RoomRow>();

  if (!full.error && full.data) return full.data;

  if (full.error && !isMissingWorkspaceColumnError(full.error.message)) {
    return null;
  }

  const base = await admin
    .from("chat_phong")
    .select(ROOM_SELECT_BASE)
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<RoomRow>();

  return base.data ?? null;
}

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
      slug: member.slug?.trim() || undefined,
      name,
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
  isGroupOwner = false,
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
    isGroupOwner,
    parentRoomId: room.id_phong_cha ?? null,
    roomTrangThai: room.trang_thai === "an" ? "an" : "active",
    role: room.id_phong_cha
      ? `Project · ${members.length} thành viên`
      : `${members.length} thành viên`,
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

  if (uniqueIds.length < MIN_GROUP_MEMBERS_SELECTED) {
    return {
      ok: false,
      error: `Chọn ít nhất ${MIN_GROUP_MEMBERS_SELECTED} bạn bè để tạo nhóm.`,
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
    .select(ROOM_SELECT_BASE)
    .single<RoomRow>();

  if (roomError || !room?.id) {
    return { ok: false, error: "Không tạo được nhóm chat." };
  }

  const allMemberIds = [viewerId, ...check.uniqueIds];
  const memberRows = allMemberIds.map((id) => ({
    id_phong: room.id,
    id_nguoi_dung: id,
    vai_tro: id === viewerId ? ("owner" as const) : ("thanh_vien" as const),
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
    true,
  );

  return { ok: true, thread };
}

export async function getGroupThread(
  roomId: string,
  viewerId: string,
): Promise<ChatThread | null> {
  const admin = createServiceRoleClient();

  const room = await selectGroupRoomById(roomId);
  if (!room) return null;

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return null;
  }

  await ensureGroupHasOwner(roomId);

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
    canManageGroupChat(normalizeGroupVaiTro(myMembership?.vai_tro)),
    canManageGroupRoles(normalizeGroupVaiTro(myMembership?.vai_tro)),
  );
}

export async function listGroupThreads(viewerId: string): Promise<ChatThread[]> {
  const admin = createServiceRoleClient();

  let memberships: Array<{
    id_phong: string;
    vai_tro: string;
    chat_phong: RoomRow | RoomRow[] | null;
  }> | null = null;

  const withWorkspace = await admin
    .from("chat_thanh_vien")
    .select(
      `id_phong, vai_tro, chat_phong!inner(${ROOM_SELECT_WORKSPACE})`,
    )
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", GROUP_ROOM);

  if (!withWorkspace.error) {
    memberships = (withWorkspace.data ?? []) as typeof memberships;
  } else {
    const base = await admin
      .from("chat_thanh_vien")
      .select(
        `id_phong, vai_tro, chat_phong!inner(${ROOM_SELECT_BASE})`,
      )
      .eq("id_nguoi_dung", viewerId)
      .is("roi_luc", null)
      .eq("chat_phong.loai_phong", GROUP_ROOM);

    if (base.error) return [];
    memberships = (base.data ?? []) as typeof memberships;
  }

  const roomIds = (memberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) return [];

  await Promise.all(roomIds.map((id) => ensureGroupHasOwner(id)));

  const { data: refreshedMemberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, vai_tro")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .in("id_phong", roomIds);

  const roleByRoom = new Map(
    (refreshedMemberships ?? []).map((row) => [
      row.id_phong,
      normalizeGroupVaiTro(row.vai_tro),
    ]),
  );

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
    const roomRaw = row.chat_phong;
    const room = (Array.isArray(roomRaw) ? roomRaw[0] : roomRaw) as RoomRow | null;
    if (!room?.id) continue;
    if (room.trang_thai === "an") continue;

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
        canManageGroupChat(roleByRoom.get(room.id) ?? normalizeGroupVaiTro(row.vai_tro)),
        canManageGroupRoles(roleByRoom.get(room.id) ?? normalizeGroupVaiTro(row.vai_tro)),
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
      senderSlug: profile.slug?.trim() || undefined,
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

  if (!canManageGroupChat(normalizeGroupVaiTro(membership?.vai_tro))) {
    return { ok: false, error: "Chỉ chủ nhóm hoặc admin mới đổi được ảnh." };
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

  const leftRole = normalizeGroupVaiTro(membership.vai_tro);
  if (leftRole === "owner") {
    const { data: successor } = await admin
      .from("chat_thanh_vien")
      .select("id, vai_tro")
      .eq("id_phong", roomId)
      .is("roi_luc", null)
      .neq("id_nguoi_dung", viewerId)
      .order("tham_gia_luc", { ascending: true })
      .returns<Array<{ id: string; vai_tro: string }>>();

    const pick =
      (successor ?? []).find((row) => normalizeGroupVaiTro(row.vai_tro) === "admin") ??
      successor?.[0];

    if (pick?.id) {
      await admin
        .from("chat_thanh_vien")
        .update({ vai_tro: "owner" })
        .eq("id", pick.id);
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

  if (!canDeleteGroupChat(normalizeGroupVaiTro(membership?.vai_tro))) {
    return { ok: false, error: "Chỉ chủ nhóm mới xóa được nhóm." };
  }

  const { error } = await admin.from("chat_phong").delete().eq("id", roomId);

  if (error) {
    return { ok: false, error: "Không xóa được nhóm chat." };
  }

  return { ok: true };
}

async function assertGroupRoom(
  roomId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("id")
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<{ id: string }>();

  if (!room?.id) {
    return { ok: false, error: "Không tìm thấy nhóm chat." };
  }
  return { ok: true };
}

async function getViewerGroupRole(
  roomId: string,
  viewerId: string,
): Promise<
  | { ok: true; role: ChatGroupVaiTro }
  | { ok: false; error: string }
> {
  const roomOk = await assertGroupRoom(roomId);
  if (!roomOk.ok) return roomOk;

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (!membership) {
    return { ok: false, error: "Không có quyền." };
  }

  return { ok: true, role: normalizeGroupVaiTro(membership.vai_tro) };
}

async function assertViewerCanManageGroup(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true; role: ChatGroupVaiTro } | { ok: false; error: string }> {
  await ensureGroupHasOwner(roomId);
  const result = await getViewerGroupRole(roomId, viewerId);
  if (!result.ok) return result;
  if (!canManageGroupChat(result.role)) {
    return { ok: false, error: "Chỉ chủ nhóm hoặc admin mới thực hiện được." };
  }
  return result;
}

async function ensureGroupHasOwner(roomId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { count: ownerCount } = await admin
    .from("chat_thanh_vien")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId)
    .eq("vai_tro", "owner")
    .is("roi_luc", null);

  if ((ownerCount ?? 0) > 0) return;

  const { data: successor } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", roomId)
    .eq("vai_tro", "admin")
    .is("roi_luc", null)
    .order("tham_gia_luc", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (successor?.id) {
    await admin
      .from("chat_thanh_vien")
      .update({ vai_tro: "owner" })
      .eq("id", successor.id);
    return;
  }

  const { data: anyMember } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", roomId)
    .is("roi_luc", null)
    .order("tham_gia_luc", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (anyMember?.id) {
    await admin
      .from("chat_thanh_vien")
      .update({ vai_tro: "owner" })
      .eq("id", anyMember.id);
  }
}

async function assertViewerIsOwner(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true; role: ChatGroupVaiTro } | { ok: false; error: string }> {
  await ensureGroupHasOwner(roomId);
  const result = await getViewerGroupRole(roomId, viewerId);
  if (!result.ok) return result;
  if (!canManageGroupRoles(result.role)) {
    return { ok: false, error: "Chỉ chủ nhóm mới thực hiện được." };
  }
  return result;
}

export async function listGroupMembers(
  roomId: string,
  viewerId: string,
): Promise<
  | {
      ok: true;
      members: ChatGroupMember[];
      isGroupAdmin: boolean;
      isGroupOwner: boolean;
      tenPhong: string | null;
      memberCount: number;
    }
  | { ok: false; error: string }
> {
  const roomOk = await assertGroupRoom(roomId);
  if (!roomOk.ok) return roomOk;

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  await ensureGroupHasOwner(roomId);

  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("ten_phong")
    .eq("id", roomId)
    .maybeSingle<{ ten_phong: string | null }>();

  const { data: rows } = await admin
    .from("chat_thanh_vien")
    .select("id, id_nguoi_dung, vai_tro, tham_gia_luc")
    .eq("id_phong", roomId)
    .is("roi_luc", null)
    .order("tham_gia_luc", { ascending: true })
    .returns<MembershipRow[]>();

  const memberIds = (rows ?? []).map((row) => row.id_nguoi_dung);
  const profiles = await loadProfiles(memberIds);

  const members: ChatGroupMember[] = (rows ?? [])
    .map((row) => {
      const profile = profiles.get(row.id_nguoi_dung);
      if (!profile) return null;
      const tenHienThi = profile.ten_hien_thi?.trim() || profile.slug;
      return {
        membershipId: row.id,
        userId: profile.id,
        slug: profile.slug,
        tenHienThi,
        avatarId: profile.avatar_id,
        avatarUrl: getAvatarUrl(profile.avatar_id),
        vaiTro: normalizeGroupVaiTro(row.vai_tro),
        isViewer: profile.id === viewerId,
      } satisfies ChatGroupMember;
    })
    .filter(Boolean) as ChatGroupMember[];

  members.sort((a, b) => {
    const byRole = compareGroupVaiTro(a.vaiTro, b.vaiTro);
    if (byRole !== 0) return byRole;
    return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
  });

  const viewer = members.find((m) => m.isViewer);

  return {
    ok: true,
    members,
    isGroupAdmin: canManageGroupChat(viewer?.vaiTro),
    isGroupOwner: canManageGroupRoles(viewer?.vaiTro),
    tenPhong: room?.ten_phong?.trim() || null,
    memberCount: members.length,
  };
}

export async function updateGroupRoomName(
  roomId: string,
  viewerId: string,
  tenPhong: string | null,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const gate = await assertViewerCanManageGroup(roomId, viewerId);
  if (!gate.ok) return gate;

  const trimmed = tenPhong?.trim() || null;
  if (trimmed && trimmed.length > 80) {
    return { ok: false, error: "Tên nhóm tối đa 80 ký tự." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("chat_phong")
    .update({ ten_phong: trimmed })
    .eq("id", roomId);

  if (error) {
    return { ok: false, error: "Không lưu được tên nhóm." };
  }

  const thread = await getGroupThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải lại được nhóm." };
  }
  return { ok: true, thread };
}

export async function addGroupMembers(
  roomId: string,
  viewerId: string,
  memberIds: string[],
): Promise<
  | { ok: true; thread: ChatThread; members: ChatGroupMember[] }
  | { ok: false; error: string }
> {
  const gate = await assertViewerCanManageGroup(roomId, viewerId);
  if (!gate.ok) return gate;

  const uniqueIds = [
    ...new Set(memberIds.map((id) => id.trim()).filter(Boolean)),
  ].filter((id) => id !== viewerId);

  if (uniqueIds.length === 0) {
    return { ok: false, error: "Chọn ít nhất một bạn bè để thêm." };
  }

  const admin = createServiceRoleClient();

  const { data: activeRows } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null);

  const activeIds = new Set((activeRows ?? []).map((row) => row.id_nguoi_dung));
  const toAdd = uniqueIds.filter((id) => !activeIds.has(id));

  if (toAdd.length === 0) {
    return { ok: false, error: "Những người này đã ở trong nhóm." };
  }

  if (activeIds.size + toAdd.length > MAX_GROUP_MEMBERS) {
    return {
      ok: false,
      error: `Nhóm tối đa ${MAX_GROUP_MEMBERS} người.`,
    };
  }

  const friendIds = new Set(await listFriends(viewerId));
  for (const id of toAdd) {
    if (!friendIds.has(id)) {
      return { ok: false, error: "Chỉ có thể thêm bạn bè vào nhóm." };
    }
    const allowed = await assertCanDirectMessage(viewerId, id);
    if (!allowed.ok) return allowed;
  }

  const { data: leftRows } = await admin
    .from("chat_thanh_vien")
    .select("id, id_nguoi_dung")
    .eq("id_phong", roomId)
    .not("roi_luc", "is", null)
    .in("id_nguoi_dung", toAdd)
    .returns<Array<{ id: string; id_nguoi_dung: string }>>();

  const rejoinByUser = new Map(
    (leftRows ?? []).map((row) => [row.id_nguoi_dung, row.id]),
  );
  const rejoinIds = toAdd.filter((id) => rejoinByUser.has(id));
  const insertIds = toAdd.filter((id) => !rejoinByUser.has(id));

  if (rejoinIds.length > 0) {
    const { error: rejoinError } = await admin
      .from("chat_thanh_vien")
      .update({
        roi_luc: null,
        vai_tro: "thanh_vien",
        tham_gia_luc: new Date().toISOString(),
      })
      .in(
        "id",
        rejoinIds.map((id) => rejoinByUser.get(id)!),
      );

    if (rejoinError) {
      return { ok: false, error: "Không thêm được thành viên." };
    }
  }

  if (insertIds.length > 0) {
    const { error: insertError } = await admin.from("chat_thanh_vien").insert(
      insertIds.map((id) => ({
        id_phong: roomId,
        id_nguoi_dung: id,
        vai_tro: "thanh_vien" as const,
      })),
    );

    if (insertError) {
      return { ok: false, error: "Không thêm được thành viên." };
    }
  }

  const listed = await listGroupMembers(roomId, viewerId);
  if (!listed.ok) return listed;

  const thread = await getGroupThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải lại được nhóm." };
  }

  return { ok: true, thread, members: listed.members };
}

export async function kickGroupMember(
  roomId: string,
  viewerId: string,
  targetUserId: string,
): Promise<
  | { ok: true; thread: ChatThread; members: ChatGroupMember[] }
  | { ok: false; error: string }
> {
  const gate = await assertViewerCanManageGroup(roomId, viewerId);
  if (!gate.ok) return gate;

  const targetId = targetUserId.trim();
  if (!targetId) {
    return { ok: false, error: "Thiếu thành viên." };
  }
  if (targetId === viewerId) {
    return { ok: false, error: "Dùng «Rời nhóm» nếu bạn muốn tự rời." };
  }

  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("id, vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", targetId)
    .is("roi_luc", null)
    .maybeSingle<{ id: string; vai_tro: string }>();

  if (!membership?.id) {
    return { ok: false, error: "Thành viên không còn trong nhóm." };
  }

  const targetRole = normalizeGroupVaiTro(membership.vai_tro);
  if (!canKickGroupMember(gate.role, targetRole)) {
    return {
      ok: false,
      error:
        targetRole === "owner"
          ? "Không thể xóa chủ nhóm."
          : "Admin chỉ xóa được thành viên thường.",
    };
  }

  const { error } = await admin
    .from("chat_thanh_vien")
    .update({ roi_luc: new Date().toISOString() })
    .eq("id", membership.id);

  if (error) {
    return { ok: false, error: "Không xóa được thành viên." };
  }

  const listed = await listGroupMembers(roomId, viewerId);
  if (!listed.ok) return listed;

  const thread = await getGroupThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải lại được nhóm." };
  }

  return { ok: true, thread, members: listed.members };
}

export async function setGroupMemberRole(
  roomId: string,
  viewerId: string,
  targetUserId: string,
  vaiTro: ChatGroupVaiTro,
): Promise<
  | { ok: true; thread: ChatThread; members: ChatGroupMember[] }
  | { ok: false; error: string }
> {
  const gate = await assertViewerIsOwner(roomId, viewerId);
  if (!gate.ok) return gate;

  if (vaiTro !== "admin" && vaiTro !== "thanh_vien") {
    return {
      ok: false,
      error: "Chỉ có thể gán Admin hoặc Thành viên.",
    };
  }

  const targetId = targetUserId.trim();
  if (!targetId) {
    return { ok: false, error: "Thiếu thành viên." };
  }
  if (targetId === viewerId) {
    return { ok: false, error: "Không thể đổi vai trò của chính mình." };
  }

  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("id, vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", targetId)
    .is("roi_luc", null)
    .maybeSingle<{ id: string; vai_tro: string }>();

  if (!membership?.id) {
    return { ok: false, error: "Thành viên không còn trong nhóm." };
  }

  const current = normalizeGroupVaiTro(membership.vai_tro);
  if (current === "owner") {
    return { ok: false, error: "Không thể đổi vai trò chủ nhóm." };
  }

  if (current === vaiTro) {
    const listed = await listGroupMembers(roomId, viewerId);
    if (!listed.ok) return listed;
    const thread = await getGroupThread(roomId, viewerId);
    if (!thread) return { ok: false, error: "Không tải lại được nhóm." };
    return { ok: true, thread, members: listed.members };
  }

  const { error } = await admin
    .from("chat_thanh_vien")
    .update({ vai_tro: vaiTro })
    .eq("id", membership.id);

  if (error) {
    return { ok: false, error: "Không đổi được vai trò." };
  }

  const listed = await listGroupMembers(roomId, viewerId);
  if (!listed.ok) return listed;

  const thread = await getGroupThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải lại được nhóm." };
  }

  return { ok: true, thread, members: listed.members };
}
