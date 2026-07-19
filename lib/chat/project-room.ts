import "server-only";

import {
  MAX_PROJECT_ROOMS_PER_PARENT,
  PROJECT_IDLE_DAYS_HINT,
} from "@/lib/chat/constants";
import {
  canManageGroupChat,
  normalizeGroupVaiTro,
} from "@/lib/chat/group-roles";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { getGroupThread, GROUP_ROOM } from "@/lib/chat/group-message";
import type { ChatThread } from "@/lib/chat/types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ChatRoomTrangThai = "active" | "an";

type ParentRoomRow = {
  id: string;
  loai_phong: string;
  id_phong_cha: string | null;
  trang_thai: string;
};

const MIGRATION_L28_HINT =
  "Chưa bật workspace project trên DB. Chạy supabase/sql/migration_chat_project_workspace.sql trên Supabase (CINs), rồi thử lại.";

function isMissingWorkspaceColumnError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("id_phong_cha") ||
    m.includes("trang_thai") ||
    m.includes("does not exist") ||
    m.includes("schema cache")
  );
}

export function isProjectIdle(
  lastAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastAt) return true;
  const t = new Date(lastAt).getTime();
  if (Number.isNaN(t)) return true;
  return now - t >= PROJECT_IDLE_DAYS_HINT * 24 * 60 * 60 * 1000;
}

async function assertViewerCanManageParent(
  parentRoomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: room, error } = await admin
    .from("chat_phong")
    .select("id, loai_phong, id_phong_cha, trang_thai")
    .eq("id", parentRoomId)
    .maybeSingle<ParentRoomRow>();

  if (error && isMissingWorkspaceColumnError(error.message)) {
    return { ok: false, error: MIGRATION_L28_HINT };
  }

  if (!room || room.loai_phong !== GROUP_ROOM) {
    return { ok: false, error: "Không tìm thấy nhóm chat." };
  }
  if (room.id_phong_cha) {
    return { ok: false, error: "Chỉ tạo project dưới nhóm gốc, không lồng thêm cấp." };
  }

  try {
    await assertRoomMember(parentRoomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", parentRoomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (!canManageGroupChat(normalizeGroupVaiTro(membership?.vai_tro))) {
    return { ok: false, error: "Chỉ chủ nhóm hoặc admin mới tạo được project." };
  }

  return { ok: true };
}

/**
 * Tạo phòng project con dưới nhóm cha.
 * Mặc định chỉ creator (owner) — admin thêm thành viên sau;
 * người chưa được thêm không thấy project (list theo membership).
 * `memberIds` tuỳ chọn: subset ⊆ thành viên đang active của cha.
 */
export async function createProjectRoom(
  parentRoomId: string,
  viewerId: string,
  tenPhong: string,
  memberIds?: string[] | null,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const name = tenPhong.trim();
  if (!name) {
    return { ok: false, error: "Nhập tên project." };
  }
  if (name.length > 80) {
    return { ok: false, error: "Tên project tối đa 80 ký tự." };
  }

  const gate = await assertViewerCanManageParent(parentRoomId, viewerId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();

  const { count } = await admin
    .from("chat_phong")
    .select("id", { count: "exact", head: true })
    .eq("id_phong_cha", parentRoomId);

  if ((count ?? 0) >= MAX_PROJECT_ROOMS_PER_PARENT) {
    return {
      ok: false,
      error: `Tối đa ${MAX_PROJECT_ROOMS_PER_PARENT} project mỗi nhóm.`,
    };
  }

  const { data: parentMembers } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", parentRoomId)
    .is("roi_luc", null);

  const parentMemberIds = new Set(
    (parentMembers ?? []).map((row) => row.id_nguoi_dung),
  );
  if (!parentMemberIds.has(viewerId)) {
    return { ok: false, error: "Không có quyền." };
  }

  let selected = memberIds?.length
    ? [...new Set(memberIds.map((id) => id.trim()).filter(Boolean))]
    : [viewerId];

  if (!selected.includes(viewerId)) {
    selected = [viewerId, ...selected];
  }

  for (const id of selected) {
    if (!parentMemberIds.has(id)) {
      return { ok: false, error: "Chỉ thêm thành viên đang ở nhóm cha." };
    }
  }

  const { data: room, error: roomError } = await admin
    .from("chat_phong")
    .insert({
      loai_phong: GROUP_ROOM,
      ten_phong: name,
      loai_context: "ban_be",
      id_phong_cha: parentRoomId,
      trang_thai: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (roomError || !room?.id) {
    if (roomError && isMissingWorkspaceColumnError(roomError.message)) {
      return { ok: false, error: MIGRATION_L28_HINT };
    }
    return { ok: false, error: "Không tạo được phòng project." };
  }

  const memberRows = selected.map((id) => ({
    id_phong: room.id,
    id_nguoi_dung: id,
    vai_tro: id === viewerId ? ("owner" as const) : ("thanh_vien" as const),
  }));

  const { error: memberError } = await admin.from("chat_thanh_vien").insert(memberRows);
  if (memberError) {
    await admin.from("chat_phong").delete().eq("id", room.id);
    return { ok: false, error: "Không thêm được thành viên project." };
  }

  const thread = await getGroupThread(room.id, viewerId);
  if (!thread) {
    return { ok: false, error: "Đã tạo project nhưng không tải lại được." };
  }

  return { ok: true, thread };
}

export async function setProjectRoomVisibility(
  roomId: string,
  viewerId: string,
  trangThai: ChatRoomTrangThai,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: room, error: roomLookupError } = await admin
    .from("chat_phong")
    .select("id, loai_phong, id_phong_cha, trang_thai")
    .eq("id", roomId)
    .maybeSingle<ParentRoomRow>();

  if (roomLookupError && isMissingWorkspaceColumnError(roomLookupError.message)) {
    return { ok: false, error: MIGRATION_L28_HINT };
  }

  if (!room || room.loai_phong !== GROUP_ROOM) {
    return { ok: false, error: "Không tìm thấy phòng." };
  }
  if (!room.id_phong_cha) {
    return { ok: false, error: "Chỉ ẩn/khôi phục được phòng project con." };
  }

  const gate = await assertViewerCanManageParent(room.id_phong_cha, viewerId);
  if (!gate.ok) {
    // Admin của chính phòng con cũng được ẩn/khôi phục
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
      return { ok: false, error: "Chỉ admin mới ẩn/khôi phục project." };
    }
  }

  const { error } = await admin
    .from("chat_phong")
    .update({ trang_thai: trangThai })
    .eq("id", roomId);

  if (error) {
    return { ok: false, error: "Không cập nhật được trạng thái phòng." };
  }

  const thread = await getGroupThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải lại được phòng." };
  }
  return { ok: true, thread };
}

export type ProjectRoomListItem = {
  roomId: string;
  name: string;
  trangThai: ChatRoomTrangThai;
  lastAt: string;
  unread: number;
  idle: boolean;
  memberCount: number;
  avatarUrl: string | null;
};

export async function listProjectRoomsForParent(
  parentRoomId: string,
  viewerId: string,
  options?: { includeHidden?: boolean },
): Promise<{ ok: true; projects: ProjectRoomListItem[] } | { ok: false; error: string }> {
  try {
    await assertRoomMember(parentRoomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const includeHidden = options?.includeHidden ?? true;

  let query = admin
    .from("chat_phong")
    .select("id, ten_phong, trang_thai, cap_nhat_luc, avatar_id")
    .eq("id_phong_cha", parentRoomId)
    .eq("loai_phong", GROUP_ROOM)
    .order("cap_nhat_luc", { ascending: false });

  if (!includeHidden) {
    query = query.eq("trang_thai", "active");
  }

  const { data: rooms } = await query.returns<
    Array<{
      id: string;
      ten_phong: string | null;
      trang_thai: string;
      cap_nhat_luc: string;
      avatar_id: string | null;
    }>
  >();

  if (!rooms?.length) {
    return { ok: true, projects: [] };
  }

  const roomIds = rooms.map((r) => r.id);

  const { data: myMemberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .in("id_phong", roomIds);

  const memberOf = new Set((myMemberships ?? []).map((r) => r.id_phong));
  const visibleRooms = rooms.filter((r) => memberOf.has(r.id));
  if (visibleRooms.length === 0) {
    return { ok: true, projects: [] };
  }

  const visibleIds = visibleRooms.map((r) => r.id);

  const { data: memberRows } = await admin
    .from("chat_thanh_vien")
    .select("id_phong")
    .in("id_phong", visibleIds)
    .is("roi_luc", null);

  const countByRoom = new Map<string, number>();
  for (const row of memberRows ?? []) {
    countByRoom.set(row.id_phong, (countByRoom.get(row.id_phong) ?? 0) + 1);
  }

  const { data: messages } = await admin
    .from("chat_tin_nhan")
    .select("id_phong, tao_luc, id_nguoi_gui")
    .in("id_phong", visibleIds)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false });

  const lastByRoom = new Map<string, string>();
  for (const msg of messages ?? []) {
    if (!lastByRoom.has(msg.id_phong)) {
      lastByRoom.set(msg.id_phong, msg.tao_luc);
    }
  }

  const projects: ProjectRoomListItem[] = visibleRooms.map((room) => {
    const lastAt = lastByRoom.get(room.id) ?? room.cap_nhat_luc;
    return {
      roomId: room.id,
      name: room.ten_phong?.trim() || "Project",
      trangThai: room.trang_thai === "an" ? "an" : "active",
      lastAt,
      unread: 0,
      idle: isProjectIdle(lastAt),
      memberCount: countByRoom.get(room.id) ?? 0,
      avatarUrl: getAvatarUrl(room.avatar_id),
    };
  });

  return { ok: true, projects };
}
