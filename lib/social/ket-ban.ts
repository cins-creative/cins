import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  logFollowRequestHandled,
  markKetBanMoiNotificationHandled,
  notifyFriendAccepted,
  notifyFriendRequest,
} from "@/lib/social/friend-notifications";
import { loadFollowProfiles, loadNotifyProfiles } from "@/lib/social/follow";
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
  const { data } = await admin
    .from("user_ket_ban")
    .select("id, id_nguoi_gui, id_nguoi_nhan, trang_thai, tao_luc, xu_ly_luc")
    .or(pairOrFilter(a, b))
    .maybeSingle<KetBanRow>();
  return data ? mapRow(data) : null;
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
  await notifyFriendRequest(nhan, gui, record.id);
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
    const { data, error } = await admin
      .from("user_ket_ban")
      .update({ trang_thai: "blocked", xu_ly_luc: now })
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
  const friendIds = await listFriends(userId);
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
  const friends = await loadFollowProfiles(admin, slice, slice.length);
  const nextOffset = offset + friends.length;
  return {
    friends,
    offset,
    nextOffset,
    hasMore: nextOffset < friendIds.length,
    totalCount: friendIds.length,
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
