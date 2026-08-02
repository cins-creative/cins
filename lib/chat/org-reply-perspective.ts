import "server-only";

import { commentVaiTroLabel } from "@/lib/social/comments/vai-tro-label";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { ChatMessage, ChatOrgReplyHint } from "@/lib/chat/types";

const ORG_ROOM = "1_org";
const ORG_STUDENT_CONTEXT = "org_student";

type OrgAdvisoryRoom = {
  orgId: string;
  studentUserId: string | null;
};

type StaffProfile = {
  name: string;
  vaiTro: string;
};

/**
 * Phòng tư vấn user↔org (`1_org` + `org_student`).
 * Trả null nếu không phải phòng này.
 */
export async function loadOrgAdvisoryRoom(
  roomId: string,
): Promise<OrgAdvisoryRoom | null> {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong, loai_context, id_org_dai_dien")
    .eq("id", roomId)
    .maybeSingle<{
      loai_phong: string;
      loai_context: string | null;
      id_org_dai_dien: string | null;
    }>();

  if (
    !room ||
    room.loai_phong !== ORG_ROOM ||
    room.loai_context === "csdt_hub" ||
    !room.id_org_dai_dien
  ) {
    return null;
  }

  const { data: student } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .eq("vai_tro", "thanh_vien")
    .is("roi_luc", null)
    .limit(1)
    .maybeSingle<{ id_nguoi_dung: string }>();

  return {
    orgId: room.id_org_dai_dien,
    studentUserId: student?.id_nguoi_dung ?? null,
  };
}

/** Membership active bất kỳ vai trò trong org (hint nội bộ). */
export async function getActiveOrgMembershipVaiTro(
  orgId: string,
  userId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active")
    .is("den_ngay", null)
    .limit(1)
    .maybeSingle<{ vai_tro: string }>();
  return data?.vai_tro?.trim() || null;
}

async function loadStaffProfiles(
  orgId: string,
  userIds: string[],
): Promise<Map<string, StaffProfile>> {
  const out = new Map<string, StaffProfile>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const [{ data: profiles }, { data: memberships }] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi, slug")
      .in("id", unique)
      .returns<
        Array<{ id: string; ten_hien_thi: string | null; slug: string | null }>
      >(),
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id_nguoi_dung, vai_tro")
      .eq("id_to_chuc", orgId)
      .in("id_nguoi_dung", unique)
      .eq("trang_thai", "active")
      .is("den_ngay", null)
      .returns<Array<{ id_nguoi_dung: string; vai_tro: string }>>(),
  ]);

  const vaiTroByUser = new Map(
    (memberships ?? []).map((row) => [row.id_nguoi_dung, row.vai_tro]),
  );

  for (const profile of profiles ?? []) {
    const vaiTro = vaiTroByUser.get(profile.id);
    if (!vaiTro) continue;
    const name =
      profile.ten_hien_thi?.trim() ||
      profile.slug?.trim() ||
      "Thành viên";
    out.set(profile.id, { name, vaiTro });
  }
  return out;
}

function redactOrgSideSender(msg: ChatMessage): ChatMessage {
  return {
    ...msg,
    senderUserId: undefined,
    senderSlug: undefined,
    senderName: undefined,
    senderAvatarInitial: undefined,
    senderAvatarHue: undefined,
    senderAvatarUrl: undefined,
    senderRole: undefined,
    orgReplyHint: undefined,
  };
}

function attachHint(msg: ChatMessage, hint: ChatOrgReplyHint): ChatMessage {
  return {
    ...msg,
    orgReplyHint: hint,
    /* Không lộ popover user cá nhân cho tin phía org — hint nội bộ tách riêng. */
    senderSlug: undefined,
    senderName: undefined,
    senderAvatarUrl: undefined,
  };
}

/**
 * Perspective phòng tư vấn org:
 * - Khách/HV: tin phía org bị redact identity staff.
 * - Member org (mọi vai trò active): tin phía org kèm `orgReplyHint`.
 */
export async function applyOrgAdvisoryPerspective(
  messages: ChatMessage[],
  viewerId: string,
  roomId: string,
): Promise<ChatMessage[]> {
  if (messages.length === 0) return messages;

  const room = await loadOrgAdvisoryRoom(roomId);
  if (!room) return messages;

  const viewerVaiTro = await getActiveOrgMembershipVaiTro(room.orgId, viewerId);
  const canSeeHint = Boolean(viewerVaiTro);
  const studentId = room.studentUserId;

  const orgSideSenderIds = [
    ...new Set(
      messages
        .map((m) => m.senderUserId)
        .filter((id): id is string => Boolean(id && id !== studentId)),
    ),
  ];

  const staffById = canSeeHint
    ? await loadStaffProfiles(room.orgId, orgSideSenderIds)
    : new Map<string, StaffProfile>();

  return messages.map((msg) => {
    const senderId = msg.senderUserId;
    const isOrgSide = Boolean(senderId && senderId !== studentId);
    if (!isOrgSide) return msg;

    if (!canSeeHint) {
      return redactOrgSideSender(msg);
    }

    const staff = senderId ? staffById.get(senderId) : undefined;
    if (!staff) {
      /* Staff đã rời org — vẫn redact identity public; không hint. */
      return redactOrgSideSender(msg);
    }

    return attachHint(msg, {
      name: staff.name,
      vaiTroLabel: commentVaiTroLabel(staff.vaiTro),
    });
  });
}

/** Gắn perspective cho 1 tin (sau send / fetch by id). */
export async function applyOrgAdvisoryPerspectiveToMessage(
  message: ChatMessage,
  viewerId: string,
  roomId: string,
): Promise<ChatMessage> {
  const [next] = await applyOrgAdvisoryPerspective(
    [message],
    viewerId,
    roomId,
  );
  return next ?? message;
}
