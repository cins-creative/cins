import "server-only";

import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import {
  enrichMessages,
  listDirectThreads,
  MESSAGE_SELECT,
  mapMessageFromRow,
  messagePreview,
  type MessageRow,
} from "@/lib/chat/direct-message";
import { canReviewOrgMilestoneTags } from "@/lib/journey/org-milestone-tag";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  ChatMessage,
  ChatOrgKind,
  ChatThread,
} from "@/lib/chat/types";
import { CHAT_ORG_KIND_LABEL } from "@/lib/chat/types";

const ORG_ROOM = "1_org";
const STAFF_MESSAGE_LIMIT = 80;

type OrgRow = {
  id: string;
  ten: string;
  loai_to_chuc: string;
  avatar_id: string | null;
};

function mapOrgLoai(loai: string): ChatOrgKind | undefined {
  if (loai === "truong_dai_hoc") return "truong_dai_hoc";
  if (loai === "co_so_dao_tao") return "co_so_dao_tao";
  if (loai === "cong_dong") return "cong_dong";
  if (loai === "studio") return "studio";
  return undefined;
}

function buildOrgThread(
  roomId: string,
  org: OrgRow,
  preview: string,
  lastAt: string,
  unread: number,
): ChatThread {
  const orgKind = mapOrgLoai(org.loai_to_chuc);
  const name = org.ten?.trim() || "Tổ chức";
  return {
    id: roomId,
    roomId,
    name,
    group: "to_chuc",
    kind: "org",
    orgKind,
    verified: true,
    role: orgKind ? CHAT_ORG_KIND_LABEL[orgKind] : "Tổ chức",
    avatarInitial: avatarInitialFromName(name),
    avatarHue: avatarHueFromSeed(org.id),
    avatarUrl: getAvatarUrl(org.avatar_id),
    preview,
    lastAt,
    unread,
    messages: [],
  };
}

export async function findOrCreateOrgStudentRoom(
  orgId: string,
  studentUserId: string,
): Promise<string> {
  const admin = createServiceRoleClient();

  const { data: memberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, chat_phong!inner(loai_phong, id_org_dai_dien)")
    .eq("id_nguoi_dung", studentUserId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", ORG_ROOM)
    .eq("chat_phong.id_org_dai_dien", orgId);

  const existing = memberships?.[0]?.id_phong;
  if (existing) return existing;

  const { data: room, error: roomError } = await admin
    .from("chat_phong")
    .insert({
      loai_phong: ORG_ROOM,
      id_org_dai_dien: orgId,
      loai_context: "org_student",
    })
    .select("id")
    .single<{ id: string }>();

  if (roomError || !room?.id) {
    throw new Error(roomError?.message ?? "Không tạo được phòng chat.");
  }

  const { error: memberError } = await admin.from("chat_thanh_vien").insert({
    id_phong: room.id,
    id_nguoi_dung: studentUserId,
    vai_tro: "thanh_vien",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return room.id;
}

export async function listOrgStudentMessagesForStaff(params: {
  orgId: string;
  studentUserId: string;
  staffUserId: string;
}): Promise<
  | { ok: true; roomId: string; messages: ChatMessage[] }
  | { ok: false; error: string }
> {
  if (!(await canReviewOrgMilestoneTags(params.orgId, params.staffUserId))) {
    return { ok: false, error: "Không có quyền nhắn tin." };
  }

  try {
    const roomId = await findOrCreateOrgStudentRoom(
      params.orgId,
      params.studentUserId,
    );
    const admin = createServiceRoleClient();
    const { data: rows, error } = await admin
      .from("chat_tin_nhan")
      .select(MESSAGE_SELECT)
      .eq("id_phong", roomId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false })
      .limit(STAFF_MESSAGE_LIMIT);

    if (error) {
      return { ok: false, error: error.message };
    }

    const chronological = (rows ?? []).slice().reverse() as MessageRow[];
    const messages = await enrichMessages(
      chronological,
      params.staffUserId,
      roomId,
      null,
    );

    return { ok: true, roomId, messages };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không tải được tin nhắn.",
    };
  }
}

export async function sendOrgMessageToStudent(params: {
  orgId: string;
  studentUserId: string;
  staffUserId: string;
  body: string;
}): Promise<
  | { ok: true; roomId: string; message: ChatMessage }
  | { ok: false; error: string }
> {
  const text = params.body.trim();
  if (!text) {
    return { ok: false, error: "Tin nhắn trống." };
  }

  if (!(await canReviewOrgMilestoneTags(params.orgId, params.staffUserId))) {
    return { ok: false, error: "Không có quyền nhắn tin." };
  }

  if (params.staffUserId === params.studentUserId) {
    return { ok: false, error: "Không thể nhắn cho chính mình." };
  }

  const admin = createServiceRoleClient();
  const { data: student } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("id", params.studentUserId)
    .maybeSingle<{ id: string }>();

  if (!student?.id) {
    return { ok: false, error: "Không tìm thấy sinh viên." };
  }

  try {
    const roomId = await findOrCreateOrgStudentRoom(
      params.orgId,
      params.studentUserId,
    );
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from("chat_tin_nhan")
      .insert({
        id_phong: roomId,
        id_nguoi_gui: params.staffUserId,
        noi_dung: text,
        loai_tin: "text",
      })
      .select(MESSAGE_SELECT)
      .single<MessageRow>();

    if (error || !data) {
      return { ok: false, error: "Không gửi được tin nhắn." };
    }

    await admin.from("chat_phong").update({ cap_nhat_luc: now }).eq("id", roomId);

    const message = mapMessageFromRow(data, params.staffUserId);
    return { ok: true, roomId, message };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không gửi được tin nhắn.",
    };
  }
}

export async function listOrgThreadsForUser(viewerId: string): Promise<ChatThread[]> {
  const admin = createServiceRoleClient();

  const { data: memberships } = await admin
    .from("chat_thanh_vien")
    .select(
      "id_phong, chat_phong!inner(id, loai_phong, id_org_dai_dien, cap_nhat_luc)",
    )
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", ORG_ROOM);

  const roomIds = (memberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) return [];

  const orgIds = [
    ...new Set(
      (memberships ?? [])
        .map((row) => {
          const room = row.chat_phong as { id_org_dai_dien?: string | null } | null;
          return room?.id_org_dai_dien ?? null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, ten, loai_to_chuc, avatar_id")
    .in("id", orgIds)
    .returns<OrgRow[]>();

  const orgById = new Map((orgs ?? []).map((org) => [org.id, org]));

  const { data: messages } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .in("id_phong", roomIds)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false });

  const lastByRoom = new Map<string, MessageRow>();
  for (const msg of messages ?? []) {
    if (!lastByRoom.has(msg.id_phong)) {
      lastByRoom.set(msg.id_phong, msg as MessageRow);
    }
  }

  const { data: reads } = await admin
    .from("chat_da_doc")
    .select("id_phong, id_tin_nhan_cuoi_doc")
    .eq("id_nguoi_dung", viewerId)
    .in("id_phong", roomIds);

  const readMessageIds = [
    ...new Set((reads ?? []).map((r) => r.id_tin_nhan_cuoi_doc as string)),
  ];
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
    const roomId = row.id_phong;
    const room = row.chat_phong as {
      id_org_dai_dien?: string | null;
      cap_nhat_luc?: string;
    } | null;
    const orgId = room?.id_org_dai_dien;
    if (!orgId) continue;

    const org = orgById.get(orgId);
    if (!org) continue;

    const last = lastByRoom.get(roomId);
    const readAt = readAtByRoom.get(roomId) ?? null;
    const unread = (messages ?? []).filter(
      (msg) =>
        msg.id_phong === roomId &&
        msg.id_nguoi_gui !== viewerId &&
        (!readAt || msg.tao_luc > readAt),
    ).length;

    threads.push(
      buildOrgThread(
        roomId,
        org,
        last ? messagePreview(last as MessageRow) : "Tin nhắn từ tổ chức",
        last?.tao_luc ?? room?.cap_nhat_luc ?? new Date(0).toISOString(),
        unread,
      ),
    );
  }

  threads.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  return threads;
}

export async function listAllChatThreads(viewerId: string): Promise<ChatThread[]> {
  const [direct, org] = await Promise.all([
    listDirectThreads(viewerId),
    listOrgThreadsForUser(viewerId),
  ]);
  const merged = [...direct, ...org];
  merged.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
  return merged;
}
