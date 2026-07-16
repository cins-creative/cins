import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  logFollowRequestHandled,
  markKetBanMoiNotificationHandled,
  notifyFriendAccepted,
  notifyFriendRequest,
} from "@/lib/social/friend-notifications";
import { followTarget, loadFollowProfiles, loadNotifyProfiles } from "@/lib/social/follow";
import type {
  MutualFriendProfile,
  PendingFollowRequest,
  QuanHe,
} from "@/lib/social/types";

export type KetBanTrangThai = "pending" | "accepted" | "blocked";

export type KetBanRecord = {
  id: string;
  idNguoiGui: string;
  idNguoiNhan: string;
  trangThai: KetBanTrangThai;
  taoLuc?: string;
  xuLyLuc?: string | null;
};

type KetBanRow = {
  id: string;
  id_nguoi_gui: string;
  id_nguoi_nhan: string;
  trang_thai: KetBanTrangThai;
  tao_luc?: string | null;
  xu_ly_luc?: string | null;
};

export const FRIENDS_SCROLL_PAGE_SIZE = 12;

function pairOrFilter(a: string, b: string): string {
  return `and(id_nguoi_gui.eq.${a},id_nguoi_nhan.eq.${b}),and(id_nguoi_gui.eq.${b},id_nguoi_nhan.eq.${a})`;
}

function mapRow(row: KetBanRow): KetBanRecord {
  return {
    id: row.id,
    idNguoiGui: row.id_nguoi_gui,
    idNguoiNhan: row.id_nguoi_nhan,
    trangThai: row.trang_thai,
    taoLuc: row.tao_luc ?? undefined,
    xuLyLuc: row.xu_ly_luc ?? null,
  };
}

async function findPairRecord(
  a: string,
  b: string,
): Promise<KetBanRecord | null> {
  if (!a || !b || a === b) return null;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_ket_ban")
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai, tao_luc, xu_ly_luc")
    .or(pairOrFilter(a, b))
    .order("tao_luc", { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;
  return mapRow(data[0] as KetBanRow);
}

export async function isFriend(a: string, b: string): Promise<boolean> {
  const row = await findPairRecord(a, b);
  return row?.trangThai === "accepted";
}

export async function getQuanHe(a: string, b: string): Promise<QuanHe> {
  if (!a || !b || a === b) return "none";
  const row = await findPairRecord(a, b);
  if (!row) return "none";
  if (row.trangThai === "blocked") return "blocked";
  if (row.trangThai === "accepted") return "accepted";
  if (row.trangThai === "pending") {
    return row.idNguoiGui === a ? "pending_sent" : "pending_received";
  }
  return "none";
}

export { notifyFriendAccepted } from "@/lib/social/friend-notifications";

export async function sendFriendRequest(
  gui: string,
  nhan: string,
): Promise<{ ok: true; data: KetBanRecord } | { ok: false; error: string }> {
  if (!gui || !nhan) {
    return { ok: false, error: "Thiếu thông tin người dùng." };
  }
  if (gui === nhan) {
    return { ok: false, error: "Không thể gửi lời mời cho chính mình." };
  }

  const existing = await findPairRecord(gui, nhan);
  if (existing) {
    if (existing.trangThai === "accepted") {
      return { ok: false, error: "Hai bạn đã là bạn bè." };
    }
    if (existing.trangThai === "blocked") {
      return { ok: false, error: "Không thể gửi lời mời." };
    }
    if (existing.trangThai === "pending") {
      const quanHe = await getQuanHe(gui, nhan);
      if (quanHe === "pending_sent") {
        return { ok: false, error: "Bạn đã gửi lời mời rồi." };
      }
      if (quanHe === "pending_received") {
        return { ok: false, error: "Người này đã gửi lời mời — hãy chấp nhận." };
      }
    }
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_ket_ban")
    .insert({
      id_nguoi_gui: gui,
      id_nguoi_nhan: nhan,
      trang_thai: "pending",
    })
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai, tao_luc, xu_ly_luc")
    .single<KetBanRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không gửi được lời mời." };
  }

  const record = mapRow(data);
  await Promise.all([
    notifyFriendRequest(nhan, gui, record.id),
    /* Gửi lời mời kết bạn → mặc định theo dõi người nhận. */
    followTarget(gui, nhan, "user"),
  ]);
  return { ok: true, data: record };
}

export async function acceptFriendRequest(
  recordId: string,
  currentUserId: string,
): Promise<{ ok: true; data: KetBanRecord } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row, error: fetchError } = await admin
    .from("user_ket_ban")
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai, tao_luc, xu_ly_luc")
    .eq("id", recordId)
    .maybeSingle<KetBanRow>();

  if (fetchError || !row) {
    return { ok: false, error: "Không tìm thấy lời mời." };
  }
  if (row.id_nguoi_nhan !== currentUserId) {
    return { ok: false, error: "Bạn không có quyền chấp nhận lời mời này." };
  }
  if (row.trang_thai !== "pending") {
    return { ok: false, error: "Lời mời không còn hiệu lực." };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("user_ket_ban")
    .update({ trang_thai: "accepted", xu_ly_luc: now })
    .eq("id", recordId)
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai, tao_luc, xu_ly_luc")
    .single<KetBanRow>();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Không chấp nhận được." };
  }

  await Promise.all([
    markKetBanMoiNotificationHandled(recordId, currentUserId),
    logFollowRequestHandled(currentUserId, row.id_nguoi_gui, "accept"),
    notifyFriendAccepted(row.id_nguoi_gui, currentUserId),
    /* Chấp nhận kết bạn → mặc định theo dõi người gửi lời mời. */
    followTarget(currentUserId, row.id_nguoi_gui, "user"),
  ]);
  return { ok: true, data: mapRow(updated) };
}

export async function declineFriendRequest(
  recordId: string,
  currentUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("user_ket_ban")
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai")
    .eq("id", recordId)
    .maybeSingle<{
      id: string;
      id_nguoi_gui: string;
      id_nguoi_nhan: string;
      trang_thai: string;
    }>();

  if (!row) return { ok: false, error: "Không tìm thấy lời mời." };
  if (row.id_nguoi_nhan !== currentUserId) {
    return { ok: false, error: "Bạn không có quyền từ chối lời mời này." };
  }

  await Promise.all([
    markKetBanMoiNotificationHandled(recordId, currentUserId),
    logFollowRequestHandled(currentUserId, row.id_nguoi_gui, "decline"),
  ]);

  const { error } = await admin.from("user_ket_ban").delete().eq("id", recordId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unfriend(
  a: string,
  b: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await findPairRecord(a, b);
  if (!row || row.trangThai !== "accepted") {
    return { ok: false, error: "Hai người chưa là bạn bè." };
  }
  const admin = createServiceRoleClient();
  const { error } = await admin.from("user_ket_ban").delete().eq("id", row.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function blockUser(
  actorId: string,
  targetId: string,
): Promise<{ ok: true; data: KetBanRecord } | { ok: false; error: string }> {
  if (actorId === targetId) {
    return { ok: false, error: "Không thể chặn chính mình." };
  }

  const existing = await findPairRecord(actorId, targetId);
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  if (existing) {
    // Chuẩn hoá hướng: người chặn luôn là `id_nguoi_gui` để về sau liệt kê
    // "người tôi đã chặn" và bỏ chặn được xác định đúng chủ thể.
    const { data, error } = await admin
      .from("user_ket_ban")
      .update({
        id_nguoi_gui: actorId,
        id_nguoi_nhan: targetId,
        trang_thai: "blocked",
        xu_ly_luc: now,
      })
      .eq("id", existing.id)
      .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai, tao_luc, xu_ly_luc")
      .single<KetBanRow>();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Không chặn được." };
    }
    return { ok: true, data: mapRow(data) };
  }

  const { data, error } = await admin
    .from("user_ket_ban")
    .insert({
      id_nguoi_gui: actorId,
      id_nguoi_nhan: targetId,
      trang_thai: "blocked",
      xu_ly_luc: now,
    })
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai, tao_luc, xu_ly_luc")
    .single<KetBanRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không chặn được." };
  }
  return { ok: true, data: mapRow(data) };
}

/** Bỏ chặn — chỉ người đã chặn (`id_nguoi_gui`) mới được gỡ. */
export async function unblockUser(
  actorId: string,
  targetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!actorId || !targetId || actorId === targetId) {
    return { ok: false, error: "Yêu cầu không hợp lệ." };
  }
  const row = await findPairRecord(actorId, targetId);
  if (!row || row.trangThai !== "blocked") {
    return { ok: false, error: "Người này chưa bị chặn." };
  }
  if (row.idNguoiGui !== actorId) {
    return { ok: false, error: "Chỉ người đã chặn mới có thể bỏ chặn." };
  }
  const admin = createServiceRoleClient();
  const { error } = await admin.from("user_ket_ban").delete().eq("id", row.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Giữ lại các user đã hoàn tất onboarding (giai_doan != null), theo đúng thứ tự đầu vào.
 * Dùng để loại hồ sơ "đang khởi tạo" khỏi danh sách bạn bè trước khi phân trang —
 * tránh lệch count/pagination khi loader ẩn bớt hồ sơ.
 */
async function filterActiveUserIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .in("id", ids)
    .not("giai_doan", "is", null)
    .returns<Array<{ id: string }>>();
  const activeSet = new Set((data ?? []).map((row) => row.id));
  return ids.filter((id) => activeSet.has(id));
}

export async function listFriends(userId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_ket_ban")
    .select("id_nguoi_gui, id_nguoi_nhan")
    .eq("trang_thai", "accepted")
    .or(`id_nguoi_gui.eq.${userId},id_nguoi_nhan.eq.${userId}`)
    .returns<Array<{ id_nguoi_gui: string; id_nguoi_nhan: string }>>();

  return (data ?? []).map((row) =>
    row.id_nguoi_gui === userId ? row.id_nguoi_nhan : row.id_nguoi_gui,
  );
}

export async function mutualFriends(a: string, b: string): Promise<string[]> {
  if (!a || !b || a === b) return [];
  const [friendsA, friendsB] = await Promise.all([listFriends(a), listFriends(b)]);
  const setB = new Set(friendsB);
  return friendsA.filter((id) => setB.has(id));
}

export async function countMutualFriends(a: string, b: string): Promise<number> {
  const ids = await mutualFriends(a, b);
  return ids.length;
}

/**
 * Đếm bạn chung viewer ↔ từng target trong 1 lần lấy `listFriends(viewer)`
 * + 1 query cạnh accepted của cả batch (tránh N+1).
 */
export async function countMutualFriendsBatch(
  viewerId: string,
  targetIds: readonly string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const unique = [
    ...new Set(targetIds.filter((id) => Boolean(id) && id !== viewerId)),
  ];
  for (const id of unique) result.set(id, 0);
  if (!viewerId || unique.length === 0) return result;

  const viewerFriendSet = new Set(await listFriends(viewerId));
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_ket_ban")
    .select("id_nguoi_gui, id_nguoi_nhan")
    .eq("trang_thai", "accepted")
    .or(
      `id_nguoi_gui.in.(${unique.join(",")}),id_nguoi_nhan.in.(${unique.join(",")})`,
    )
    .returns<Array<{ id_nguoi_gui: string; id_nguoi_nhan: string }>>();

  const friendsByTarget = new Map<string, Set<string>>();
  for (const id of unique) friendsByTarget.set(id, new Set());

  for (const row of data ?? []) {
    const a = row.id_nguoi_gui;
    const b = row.id_nguoi_nhan;
    friendsByTarget.get(a)?.add(b);
    friendsByTarget.get(b)?.add(a);
  }

  for (const [targetId, friends] of friendsByTarget) {
    let count = 0;
    for (const friendId of friends) {
      if (friendId !== viewerId && viewerFriendSet.has(friendId)) count += 1;
    }
    result.set(targetId, count);
  }
  return result;
}

export async function attachMutualFriendCounts<
  T extends { idNguoiDung: string; mutualFriendCount?: number },
>(viewerId: string | null | undefined, profiles: T[]): Promise<T[]> {
  if (!viewerId || profiles.length === 0) return profiles;
  const counts = await countMutualFriendsBatch(
    viewerId,
    profiles.map((p) => p.idNguoiDung),
  );
  return profiles.map((p) => ({
    ...p,
    mutualFriendCount:
      p.idNguoiDung === viewerId
        ? 0
        : (counts.get(p.idNguoiDung) ?? 0),
  }));
}

export async function countFriends(userId: string): Promise<number> {
  const ids = await listFriends(userId);
  return ids.length;
}

export type PendingFriendRequest = PendingFollowRequest & {
  ketBanId: string;
};

export async function listPendingReceived(
  userId: string,
  options: { limit?: number } = {},
): Promise<PendingFriendRequest[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("user_ket_ban")
    .select("id, id_nguoi_gui, tao_luc")
    .eq("id_nguoi_nhan", userId)
    .eq("trang_thai", "pending")
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  const senderIds = [
    ...new Set((rows ?? []).map((r) => r.id_nguoi_gui as string)),
  ];
  if (senderIds.length === 0) return [];

  const profiles = await loadNotifyProfiles(admin, senderIds);
  const profileById = new Map(profiles.map((p) => [p.idNguoiDung, p]));
  const rowBySender = new Map(
    (rows ?? []).map((r) => [r.id_nguoi_gui as string, r]),
  );

  return senderIds
    .map((senderId) => {
      const profile = profileById.get(senderId);
      const row = rowBySender.get(senderId);
      if (!profile || !row) return null;
      return { ...profile, ketBanId: row.id as string };
    })
    .filter((item): item is PendingFriendRequest => item !== null);
}

export async function findPendingRecordId(
  receiverId: string,
  senderId: string,
): Promise<string | null> {
  const row = await findPairRecord(senderId, receiverId);
  if (!row || row.trangThai !== "pending" || row.idNguoiNhan !== receiverId) {
    return null;
  }
  return row.id;
}

export async function getQuanHeDetail(
  a: string,
  b: string,
): Promise<{ trangThai: QuanHe; ketBanId: string | null }> {
  if (!a || !b || a === b) {
    return { trangThai: "none", ketBanId: null };
  }
  const row = await findPairRecord(a, b);
  if (!row) return { trangThai: "none", ketBanId: null };
  const trangThai = await getQuanHe(a, b);
  return { trangThai, ketBanId: row.id };
}

/** Huỷ lời mời (pending) hoặc unfriend (accepted) — cả hai phía được gọi. */
export async function removeByRecordId(
  recordId: string,
  currentUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("user_ket_ban")
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai")
    .eq("id", recordId)
    .maybeSingle<{ id: string; id_nguoi_gui: string; id_nguoi_nhan: string; trang_thai: string }>();

  if (!row) return { ok: false, error: "Không tìm thấy bản ghi." };
  if (row.id_nguoi_gui !== currentUserId && row.id_nguoi_nhan !== currentUserId) {
    return { ok: false, error: "Bạn không có quyền thực hiện." };
  }
  if (row.trang_thai === "blocked") {
    return { ok: false, error: "Không thể thực hiện với người đã chặn." };
  }

  const { error } = await admin.from("user_ket_ban").delete().eq("id", recordId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listMutualFriendProfilesPage(
  userId: string,
  params: { offset?: number; limit?: number } = {},
): Promise<{
  friends: MutualFriendProfile[];
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalCount: number;
}> {
  const friendIds = await filterActiveUserIds(await listFriends(userId));
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(
    24,
    Math.max(1, params.limit ?? FRIENDS_SCROLL_PAGE_SIZE),
  );
  const slice = friendIds.slice(offset, offset + limit);
  if (slice.length === 0) {
    return {
      friends: [],
      offset,
      nextOffset: offset,
      hasMore: false,
      totalCount: friendIds.length,
    };
  }

  const admin = createServiceRoleClient();
  const [profiles, recordIdByFriend] = await Promise.all([
    loadFollowProfiles(admin, slice, slice.length),
    loadAcceptedRecordIds(userId, slice),
  ]);
  // Gắn `ketBanId` để UI hủy kết bạn qua DELETE /api/ket-ban/:ketBanId.
  const friends = profiles.map((p) => ({
    ...p,
    ketBanId: recordIdByFriend.get(p.idNguoiDung),
  }));
  const nextOffset = offset + friends.length;
  return {
    friends,
    offset,
    nextOffset,
    hasMore: nextOffset < friendIds.length,
    totalCount: friendIds.length,
  };
}

/** Map friendUserId → record id `user_ket_ban` (trạng thái accepted). */
async function loadAcceptedRecordIds(
  userId: string,
  friendIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (friendIds.length === 0) return map;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_ket_ban")
    .select("id, id_nguoi_gui, id_nguoi_nhan")
    .eq("trang_thai", "accepted")
    .or(`id_nguoi_gui.eq.${userId},id_nguoi_nhan.eq.${userId}`)
    .returns<
      Array<{ id: string; id_nguoi_gui: string; id_nguoi_nhan: string }>
    >();
  const wanted = new Set(friendIds);
  for (const row of data ?? []) {
    const other =
      row.id_nguoi_gui === userId ? row.id_nguoi_nhan : row.id_nguoi_gui;
    if (wanted.has(other)) map.set(other, row.id);
  }
  return map;
}

/** Danh sách người mà `userId` đã chặn (phân trang), mới chặn hiện trước. */
export async function listBlockedProfilesPage(
  userId: string,
  params: { offset?: number; limit?: number } = {},
): Promise<{
  users: MutualFriendProfile[];
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalCount: number;
}> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_ket_ban")
    .select("id_nguoi_nhan, xu_ly_luc")
    .eq("trang_thai", "blocked")
    .eq("id_nguoi_gui", userId)
    .order("xu_ly_luc", { ascending: false })
    .returns<Array<{ id_nguoi_nhan: string; xu_ly_luc: string | null }>>();

  const blockedIds = await filterActiveUserIds(
    (data ?? []).map((row) => row.id_nguoi_nhan),
  );
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(
    24,
    Math.max(1, params.limit ?? FRIENDS_SCROLL_PAGE_SIZE),
  );
  const slice = blockedIds.slice(offset, offset + limit);
  if (slice.length === 0) {
    return {
      users: [],
      offset,
      nextOffset: offset,
      hasMore: false,
      totalCount: blockedIds.length,
    };
  }

  const users = await loadFollowProfiles(admin, slice, slice.length);
  const nextOffset = offset + slice.length;
  return {
    users,
    offset,
    nextOffset,
    hasMore: nextOffset < blockedIds.length,
    totalCount: blockedIds.length,
  };
}

export async function listMutualFriendProfiles(
  userId: string,
): Promise<MutualFriendProfile[]> {
  const page = await listMutualFriendProfilesPage(userId, { offset: 0, limit: 60 });
  return page.friends;
}

export async function loadMutualFriendProfiles(
  userIds: string[],
  limit = 20,
): Promise<MutualFriendProfile[]> {
  if (userIds.length === 0) return [];
  const admin = createServiceRoleClient();
  return loadFollowProfiles(admin, userIds.slice(0, limit), limit);
}
