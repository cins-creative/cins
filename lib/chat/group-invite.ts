import "server-only";

import { randomBytes } from "crypto";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { MAX_GROUP_MEMBERS } from "@/lib/chat/constants";
import {
  assertRoomMember,
} from "@/lib/chat/direct-message";
import {
  getGroupThread,
  GROUP_ROOM,
  listGroupMembers,
} from "@/lib/chat/group-message";
import {
  canManageGroupChat,
  normalizeGroupVaiTro,
} from "@/lib/chat/group-roles";
import { getAvatarUrl } from "@/lib/journey/profile";
import { isFriend } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  ChatGroupInvitePreview,
  ChatGroupJoinRequest,
  ChatGroupMember,
  ChatThread,
} from "@/lib/chat/types";

export type { ChatGroupInvitePreview, ChatGroupJoinRequest };

function generateInviteCode(): string {
  return randomBytes(12).toString("base64url").replace(/=+$/, "").slice(0, 16);
}

export function buildGroupInvitePath(maMoi: string): string {
  return `/chat/nhom/moi/${encodeURIComponent(maMoi)}`;
}

export function buildGroupInviteUrl(maMoi: string, origin?: string | null): string {
  const base =
    origin?.replace(/\/$/, "") ||
    getConfiguredSiteOrigin() ||
    "http://localhost:3001";
  return `${base}${buildGroupInvitePath(maMoi)}`;
}

async function assertViewerGroupAdmin(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (!canManageGroupChat(normalizeGroupVaiTro(data?.vai_tro))) {
    return { ok: false, error: "Chỉ chủ nhóm hoặc admin mới quản lý link mời." };
  }
  return { ok: true };
}

export async function ensureGroupInviteCode(
  roomId: string,
  viewerId: string,
  rotate = false,
): Promise<
  | { ok: true; maMoi: string; inviteUrl: string }
  | { ok: false; error: string }
> {
  const gate = await assertViewerGroupAdmin(roomId, viewerId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong, ma_moi")
    .eq("id", roomId)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<{ id: string; loai_phong: string; ma_moi: string | null }>();

  if (!room?.id) {
    return { ok: false, error: "Không tìm thấy nhóm chat." };
  }

  if (room.ma_moi?.trim() && !rotate) {
    const maMoi = room.ma_moi.trim();
    return { ok: true, maMoi, inviteUrl: buildGroupInviteUrl(maMoi) };
  }

  let maMoi = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await admin
      .from("chat_phong")
      .update({ ma_moi: maMoi })
      .eq("id", roomId);

    if (!error) {
      return { ok: true, maMoi, inviteUrl: buildGroupInviteUrl(maMoi) };
    }
    maMoi = generateInviteCode();
  }

  return { ok: false, error: "Không tạo được link mời." };
}

async function isFriendOfAnyMember(
  viewerId: string,
  memberIds: string[],
): Promise<boolean> {
  for (const memberId of memberIds) {
    if (memberId === viewerId) continue;
    if (await isFriend(viewerId, memberId)) return true;
  }
  return false;
}

export async function getGroupInvitePreview(
  maMoiRaw: string,
  viewerId: string | null,
): Promise<
  | { ok: true; preview: ChatGroupInvitePreview }
  | { ok: false; error: string }
> {
  const maMoi = maMoiRaw.trim();
  if (!maMoi) {
    return { ok: false, error: "Link mời không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("id, ten_phong, avatar_id, loai_phong, ma_moi")
    .eq("ma_moi", maMoi)
    .eq("loai_phong", GROUP_ROOM)
    .maybeSingle<{
      id: string;
      ten_phong: string | null;
      avatar_id: string | null;
      loai_phong: string;
      ma_moi: string;
    }>();

  if (!room?.id) {
    return { ok: false, error: "Link mời không còn hiệu lực." };
  }

  const { data: memberRows } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", room.id)
    .is("roi_luc", null);

  const memberIds = (memberRows ?? []).map((row) => row.id_nguoi_dung);
  const memberCount = memberIds.length;

  let tenPhong = room.ten_phong?.trim() || "";
  if (!tenPhong) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("ten_hien_thi, slug")
      .in("id", memberIds.slice(0, 3))
      .returns<Array<{ ten_hien_thi: string; slug: string }>>();
    const names = (profiles ?? [])
      .map((p) => p.ten_hien_thi?.trim() || p.slug)
      .filter(Boolean);
    tenPhong = names.length > 0 ? names.join(", ") : "Nhóm chat";
  }

  const base: ChatGroupInvitePreview = {
    maMoi,
    roomId: room.id,
    tenPhong,
    avatarUrl: getAvatarUrl(room.avatar_id),
    memberCount,
    alreadyMember: false,
    pendingRequest: false,
    canRequest: false,
  };

  if (!viewerId) {
    return {
      ok: true,
      preview: {
        ...base,
        reason: "Đăng nhập để xin gia nhập nhóm.",
      },
    };
  }

  if (memberIds.includes(viewerId)) {
    return {
      ok: true,
      preview: { ...base, alreadyMember: true, reason: "Bạn đã ở trong nhóm." },
    };
  }

  const { data: existingReq } = await admin
    .from("chat_yeu_cau_tham_gia")
    .select("trang_thai")
    .eq("id_phong", room.id)
    .eq("id_nguoi_dung", viewerId)
    .maybeSingle<{ trang_thai: string }>();

  if (existingReq?.trang_thai === "pending") {
    return {
      ok: true,
      preview: {
        ...base,
        pendingRequest: true,
        reason: "Đã gửi yêu cầu — chờ admin duyệt.",
      },
    };
  }

  if (memberCount >= MAX_GROUP_MEMBERS) {
    return {
      ok: true,
      preview: {
        ...base,
        reason: `Nhóm đã đủ ${MAX_GROUP_MEMBERS} người.`,
      },
    };
  }

  const friendOk = await isFriendOfAnyMember(viewerId, memberIds);
  if (!friendOk) {
    return {
      ok: true,
      preview: {
        ...base,
        reason: "Chỉ bạn bè của thành viên nhóm mới xin gia nhập được.",
      },
    };
  }

  return {
    ok: true,
    preview: { ...base, canRequest: true },
  };
}

export async function requestJoinGroupByInvite(
  maMoiRaw: string,
  viewerId: string,
): Promise<{ ok: true; preview: ChatGroupInvitePreview } | { ok: false; error: string }> {
  const previewResult = await getGroupInvitePreview(maMoiRaw, viewerId);
  if (!previewResult.ok) return previewResult;

  const { preview } = previewResult;
  if (preview.alreadyMember) {
    return { ok: true, preview };
  }
  if (preview.pendingRequest) {
    return { ok: true, preview };
  }
  if (!preview.canRequest) {
    return {
      ok: false,
      error: preview.reason ?? "Không thể xin gia nhập nhóm này.",
    };
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("chat_yeu_cau_tham_gia").upsert(
    {
      id_phong: preview.roomId,
      id_nguoi_dung: viewerId,
      trang_thai: "pending",
      tao_luc: now,
      xu_ly_luc: null,
    },
    { onConflict: "id_phong,id_nguoi_dung" },
  );

  if (error) {
    return { ok: false, error: "Không gửi được yêu cầu." };
  }

  return {
    ok: true,
    preview: {
      ...preview,
      canRequest: false,
      pendingRequest: true,
      reason: "Đã gửi yêu cầu — chờ admin duyệt.",
    },
  };
}

export async function listGroupJoinRequests(
  roomId: string,
  viewerId: string,
): Promise<
  | { ok: true; requests: ChatGroupJoinRequest[] }
  | { ok: false; error: string }
> {
  const gate = await assertViewerGroupAdmin(roomId, viewerId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("chat_yeu_cau_tham_gia")
    .select("id, id_nguoi_dung, tao_luc")
    .eq("id_phong", roomId)
    .eq("trang_thai", "pending")
    .order("tao_luc", { ascending: true })
    .returns<Array<{ id: string; id_nguoi_dung: string; tao_luc: string }>>();

  const userIds = (rows ?? []).map((row) => row.id_nguoi_dung);
  if (userIds.length === 0) {
    return { ok: true, requests: [] };
  }

  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds)
    .returns<
      Array<{
        id: string;
        slug: string;
        ten_hien_thi: string;
        avatar_id: string | null;
      }>
    >();

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const requests: ChatGroupJoinRequest[] = (rows ?? [])
    .map((row) => {
      const profile = byId.get(row.id_nguoi_dung);
      if (!profile) return null;
      const tenHienThi = profile.ten_hien_thi?.trim() || profile.slug;
      return {
        id: row.id,
        userId: profile.id,
        slug: profile.slug,
        tenHienThi,
        avatarId: profile.avatar_id,
        avatarUrl: getAvatarUrl(profile.avatar_id),
        taoLuc: row.tao_luc,
      } satisfies ChatGroupJoinRequest;
    })
    .filter(Boolean) as ChatGroupJoinRequest[];

  return { ok: true, requests };
}

export async function respondGroupJoinRequest(
  roomId: string,
  viewerId: string,
  requestId: string,
  action: "approve" | "reject",
): Promise<
  | {
      ok: true;
      thread: ChatThread;
      members: ChatGroupMember[];
      requests: ChatGroupJoinRequest[];
    }
  | { ok: false; error: string }
> {
  const gate = await assertViewerGroupAdmin(roomId, viewerId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  const { data: req } = await admin
    .from("chat_yeu_cau_tham_gia")
    .select("id, id_phong, id_nguoi_dung, trang_thai")
    .eq("id", requestId)
    .eq("id_phong", roomId)
    .maybeSingle<{
      id: string;
      id_phong: string;
      id_nguoi_dung: string;
      trang_thai: string;
    }>();

  if (!req?.id || req.trang_thai !== "pending") {
    return { ok: false, error: "Yêu cầu không còn hiệu lực." };
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const { error } = await admin
      .from("chat_yeu_cau_tham_gia")
      .update({ trang_thai: "rejected", xu_ly_luc: now })
      .eq("id", req.id);

    if (error) {
      return { ok: false, error: "Không từ chối được yêu cầu." };
    }
  } else {
    const { data: members } = await admin
      .from("chat_thanh_vien")
      .select("id_nguoi_dung")
      .eq("id_phong", roomId)
      .is("roi_luc", null);

    const memberIds = (members ?? []).map((m) => m.id_nguoi_dung);
    if (memberIds.length >= MAX_GROUP_MEMBERS) {
      return {
        ok: false,
        error: `Nhóm tối đa ${MAX_GROUP_MEMBERS} người.`,
      };
    }

    if (memberIds.includes(req.id_nguoi_dung)) {
      await admin
        .from("chat_yeu_cau_tham_gia")
        .update({ trang_thai: "accepted", xu_ly_luc: now })
        .eq("id", req.id);
    } else {
      const ok = await isFriendOfAnyMember(req.id_nguoi_dung, memberIds);
      if (!ok) {
        return {
          ok: false,
          error: "Người này không còn là bạn bè của thành viên nhóm.",
        };
      }

      const { data: leftRow } = await admin
        .from("chat_thanh_vien")
        .select("id")
        .eq("id_phong", roomId)
        .eq("id_nguoi_dung", req.id_nguoi_dung)
        .not("roi_luc", "is", null)
        .maybeSingle<{ id: string }>();

      if (leftRow?.id) {
        const { error: rejoinError } = await admin
          .from("chat_thanh_vien")
          .update({
            roi_luc: null,
            vai_tro: "thanh_vien",
            tham_gia_luc: now,
          })
          .eq("id", leftRow.id);
        if (rejoinError) {
          return { ok: false, error: "Không thêm được thành viên." };
        }
      } else {
        const { error: insertError } = await admin
          .from("chat_thanh_vien")
          .insert({
            id_phong: roomId,
            id_nguoi_dung: req.id_nguoi_dung,
            vai_tro: "thanh_vien",
          });
        if (insertError) {
          return { ok: false, error: "Không thêm được thành viên." };
        }
      }

      await admin
        .from("chat_yeu_cau_tham_gia")
        .update({ trang_thai: "accepted", xu_ly_luc: now })
        .eq("id", req.id);
    }

    const listedMembers = await listGroupMembers(roomId, viewerId);
    if (!listedMembers.ok) return listedMembers;
    const thread = await getGroupThread(roomId, viewerId);
    if (!thread) {
      return { ok: false, error: "Không tải lại được nhóm." };
    }
    const listed = await listGroupJoinRequests(roomId, viewerId);
    if (!listed.ok) return listed;

    return {
      ok: true,
      thread,
      members: listedMembers.members,
      requests: listed.requests,
    };
  }

  const listedMembers = await listGroupMembers(roomId, viewerId);
  if (!listedMembers.ok) return listedMembers;
  const thread = await getGroupThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải lại được nhóm." };
  }
  const listed = await listGroupJoinRequests(roomId, viewerId);
  if (!listed.ok) return listed;

  return {
    ok: true,
    thread,
    members: listedMembers.members,
    requests: listed.requests,
  };
}
