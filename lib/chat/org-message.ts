import "server-only";

import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import {
  enrichMessages,
  listDirectThreads,
  markRoomRead,
  MESSAGE_SELECT,
  messagePreview,
  type MessageRow,
} from "@/lib/chat/direct-message";
import type { OrgInboxThread } from "@/lib/chat/org-inbox-types";
import { canReviewOrgMilestoneTags } from "@/lib/journey/org-milestone-tag";
import { listOrgMembershipMilestoneRequests } from "@/lib/journey/membership-milestone";
import type { OrgMembershipMilestoneRequestItem } from "@/lib/journey/membership-milestone-types";
import { getAvatarUrl, getGiaiDoanLabel } from "@/lib/journey/profile";
import { commentVaiTroLabel } from "@/lib/social/comments/vai-tro-label";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { GiaiDoan } from "@/lib/auth/session";
import type {
  ChatMessage,
  ChatOrgKind,
  ChatThread,
} from "@/lib/chat/types";
import { CHAT_ORG_KIND_LABEL } from "@/lib/chat/types";

const ORG_ROOM = "1_org";
const LOP_ROOM = "lop_hoc";
const STAFF_MESSAGE_LIMIT = 80;

async function pickCanonicalOrgStudentRoom(
  admin: ReturnType<typeof createServiceRoleClient>,
  roomIds: string[],
): Promise<string> {
  if (roomIds.length === 1) return roomIds[0]!;
  const { data: rooms } = await admin
    .from("chat_phong")
    .select("id, cap_nhat_luc")
    .in("id", roomIds)
    .returns<Array<{ id: string; cap_nhat_luc: string | null }>>();

  let bestId = roomIds[0]!;
  let bestTime = -1;
  for (const room of rooms ?? []) {
    const t = new Date(room.cap_nhat_luc ?? 0).getTime();
    if (t >= bestTime) {
      bestTime = t;
      bestId = room.id;
    }
  }
  return bestId;
}

function mergeOrgThreadPair(primary: ChatThread, secondary: ChatThread): ChatThread {
  return {
    ...primary,
    unread: primary.unread + secondary.unread,
  };
}

function dedupeOrgThreadsByOrg(threads: ChatThread[]): ChatThread[] {
  const byOrg = new Map<string, ChatThread>();
  const hubs: ChatThread[] = [];
  for (const thread of threads) {
    // Hub CSĐT không dedupe với phòng tư vấn 1_org.
    if (thread.isOrgHub) {
      hubs.push(thread);
      continue;
    }
    const orgId = thread.orgId;
    if (!orgId) {
      byOrg.set(thread.roomId, thread);
      continue;
    }
    const existing = byOrg.get(orgId);
    if (!existing) {
      byOrg.set(orgId, thread);
      continue;
    }
    const keepIncoming =
      new Date(thread.lastAt).getTime() >= new Date(existing.lastAt).getTime();
    byOrg.set(
      orgId,
      mergeOrgThreadPair(keepIncoming ? thread : existing, keepIncoming ? existing : thread),
    );
  }
  return [...hubs, ...byOrg.values()];
}

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
  options?: { isOrgHub?: boolean },
): ChatThread {
  const orgKind = mapOrgLoai(org.loai_to_chuc);
  const name = org.ten?.trim() || "Tổ chức";
  const isOrgHub = Boolean(options?.isOrgHub);
  return {
    id: roomId,
    roomId,
    orgId: org.id,
    name,
    group: "to_chuc",
    kind: "org",
    orgKind,
    verified: true,
    role: isOrgHub
      ? "Chat cơ sở · mọi thành viên liên quan"
      : "Tư vấn riêng với cơ sở",
    avatarInitial: avatarInitialFromName(name),
    avatarHue: avatarHueFromSeed(org.id),
    avatarUrl: getAvatarUrl(org.avatar_id),
    preview,
    lastAt,
    unread,
    isOrgHub,
    isOrgAdvisory: !isOrgHub,
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
    .select(
      "id_phong, chat_phong!inner(loai_phong, loai_context, id_org_dai_dien)",
    )
    .eq("id_nguoi_dung", studentUserId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", ORG_ROOM)
    .eq("chat_phong.id_org_dai_dien", orgId)
    .neq("chat_phong.loai_context", "csdt_hub");

  const roomIds = [
    ...new Set((memberships ?? []).map((row) => row.id_phong).filter(Boolean)),
  ];
  if (roomIds.length > 0) {
    return pickCanonicalOrgStudentRoom(admin, roomIds);
  }

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

async function ensureStaffOrgRoomMember(
  admin: ReturnType<typeof createServiceRoleClient>,
  roomId: string,
  staffUserId: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", staffUserId)
    .is("roi_luc", null)
    .maybeSingle<{ id: string }>();

  if (existing?.id) return;

  const { error } = await admin.from("chat_thanh_vien").insert({
    id_phong: roomId,
    id_nguoi_dung: staffUserId,
    vai_tro: "admin",
  });

  if (error) {
    throw new Error(error.message);
  }
}

function inboxSubjectFromMessage(row: MessageRow | undefined): string {
  if (!row) return "Tin nhắn mới";
  const text = messagePreview(row).replace(/\s+/g, " ").trim();
  if (!text) return "Tin nhắn mới";
  const firstLine = text.split("\n")[0]?.trim() ?? text;
  if (firstLine.length <= 72) return firstLine;
  return `${firstLine.slice(0, 69)}…`;
}

type OrgRoomMember = { id_nguoi_dung: string; vai_tro: string };

/** User đối thoại với org trong phòng 1_org (không lọc theo staff org — admin có thể tự nhắn thử). */
function resolveStudentUserIdForOrgRoom(
  roomMembers: OrgRoomMember[],
  roomMessages: MessageRow[],
): string | null {
  const studentMember = roomMembers.find((member) => member.vai_tro === "thanh_vien");
  if (studentMember) return studentMember.id_nguoi_dung;

  const nonAdminMember = roomMembers.find((member) => member.vai_tro !== "admin");
  if (nonAdminMember) return nonAdminMember.id_nguoi_dung;

  if (roomMessages.length === 0) return null;

  const sorted = [...roomMessages].sort(
    (a, b) => new Date(a.tao_luc).getTime() - new Date(b.tao_luc).getTime(),
  );
  return sorted[0]!.id_nguoi_gui;
}

/** Nhãn + mã vai trò user ↔ org trong inbox tuyển sinh. */
function resolveOrgInboxContact(
  orgVaiTro: string | null,
  giaiDoan: GiaiDoan | null,
): { label: string; roleKey: string } {
  if (orgVaiTro) {
    return { label: commentVaiTroLabel(orgVaiTro), roleKey: orgVaiTro };
  }
  if (giaiDoan === "dang_day") {
    return { label: "Giảng viên", roleKey: "giao_vien" };
  }
  return { label: "Người lạ", roleKey: "nguoi_la" };
}

function buildInboxThread(params: {
  roomId: string;
  studentUserId: string;
  studentName: string;
  studentSlug: string;
  studentAvatarUrl: string | null;
  studentContactLabel: string;
  studentContactRole: string;
  studentRole: string;
  roomMessages: MessageRow[];
  staffUserId: string;
  readAt: string | null;
}): OrgInboxThread | null {
  if (params.roomMessages.length === 0) return null;

  const sorted = [...params.roomMessages].sort(
    (a, b) => new Date(a.tao_luc).getTime() - new Date(b.tao_luc).getTime(),
  );
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const unreadMessages = sorted.filter(
    (msg) =>
      msg.id_nguoi_gui === params.studentUserId &&
      (!params.readAt || msg.tao_luc > params.readAt),
  );
  const unreadCount = unreadMessages.length;
  const status: OrgInboxThread["status"] =
    last.id_nguoi_gui === params.studentUserId ? "open" : "replied";

  return {
    roomId: params.roomId,
    studentUserId: params.studentUserId,
    studentName: params.studentName,
    studentSlug: params.studentSlug,
    studentAvatarUrl: params.studentAvatarUrl,
    studentContactLabel: params.studentContactLabel,
    studentContactRole: params.studentContactRole,
    studentRole: params.studentRole,
    subject: inboxSubjectFromMessage(first),
    preview: messagePreview(last),
    lastAt: last.tao_luc,
    unread: unreadCount > 0,
    unreadCount,
    status,
    pendingVerification: null,
    pendingDonHocPhi: false,
    enrollments: [],
  };
}

function buildInboxThreadFromVerification(params: {
  roomId: string;
  request: OrgMembershipMilestoneRequestItem;
  studentContactLabel: string;
  studentContactRole: string;
  studentRole: string;
}): OrgInboxThread {
  return {
    roomId: params.roomId,
    studentUserId: params.request.studentUserId,
    studentName: params.request.studentName,
    studentSlug: params.request.studentSlug,
    studentAvatarUrl: params.request.studentAvatarUrl,
    studentContactLabel: params.studentContactLabel,
    studentContactRole: params.studentContactRole,
    studentRole: params.studentRole,
    subject: params.request.title,
    preview: "Chờ xác thực cột mốc",
    lastAt: params.request.submittedAt,
    unread: false,
    unreadCount: 0,
    status: "open",
    pendingVerification: params.request,
    pendingDonHocPhi: false,
    enrollments: [],
  };
}

async function resolveStudentContactMeta(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  studentUserId: string,
): Promise<{
  studentName: string;
  studentSlug: string;
  studentAvatarUrl: string | null;
  studentContactLabel: string;
  studentContactRole: string;
  studentRole: string;
}> {
  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("slug, ten_hien_thi, avatar_id, giai_doan")
    .eq("id", studentUserId)
    .maybeSingle<{
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
      giai_doan: string | null;
    }>();

  const { data: orgMember } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", studentUserId)
    .eq("trang_thai", "active")
    .maybeSingle<{ vai_tro: string }>();

  const giaiDoan = (profile?.giai_doan as GiaiDoan | null) ?? null;
  const studentName =
    profile?.ten_hien_thi?.trim() || profile?.slug?.trim() || "User";

  const contact = resolveOrgInboxContact(
    orgMember?.vai_tro ?? null,
    giaiDoan,
  );

  return {
    studentName,
    studentSlug: profile?.slug ?? "",
    studentAvatarUrl: getAvatarUrl(profile?.avatar_id ?? null),
    studentContactLabel: contact.label,
    studentContactRole: contact.roleKey,
    studentRole: giaiDoan ? getGiaiDoanLabel(giaiDoan) : "Thành viên CINs",
  };
}

export async function listOrgInboxThreadsForStaff(
  orgId: string,
  staffUserId: string,
): Promise<
  | { ok: true; threads: OrgInboxThread[] }
  | { ok: false; error: string }
> {
  if (!(await canReviewOrgMilestoneTags(orgId, staffUserId))) {
    return { ok: false, error: "Không có quyền xem hộp thư." };
  }

  const admin = createServiceRoleClient();
  const { data: rooms, error: roomError } = await admin
    .from("chat_phong")
    .select("id, cap_nhat_luc, loai_context")
    .eq("loai_phong", ORG_ROOM)
    .eq("id_org_dai_dien", orgId)
    .returns<
      Array<{ id: string; cap_nhat_luc: string; loai_context: string | null }>
    >();

  if (roomError) return { ok: false, error: roomError.message };

  // Inbox tư vấn — không gồm hub CSĐT.
  const roomList = (rooms ?? []).filter((r) => r.loai_context !== "csdt_hub");
  const roomIds = roomList.map((room) => room.id);

  const { data: members } = roomIds.length
    ? await admin
        .from("chat_thanh_vien")
        .select("id_phong, id_nguoi_dung, vai_tro")
        .in("id_phong", roomIds)
        .is("roi_luc", null)
        .returns<
          Array<{ id_phong: string; id_nguoi_dung: string; vai_tro: string }>
        >()
    : { data: [] as Array<{ id_phong: string; id_nguoi_dung: string; vai_tro: string }> };

  const membersByRoom = new Map<string, OrgRoomMember[]>();
  for (const member of members ?? []) {
    const list = membersByRoom.get(member.id_phong) ?? [];
    list.push({
      id_nguoi_dung: member.id_nguoi_dung,
      vai_tro: member.vai_tro,
    });
    membersByRoom.set(member.id_phong, list);
  }

  const { data: messageRows } = roomIds.length
    ? await admin
        .from("chat_tin_nhan")
        .select(MESSAGE_SELECT)
        .in("id_phong", roomIds)
        .eq("da_xoa", false)
        .order("tao_luc", { ascending: true })
        .returns<MessageRow[]>()
    : { data: [] as MessageRow[] };

  const messagesByRoom = new Map<string, MessageRow[]>();
  for (const row of messageRows ?? []) {
    const list = messagesByRoom.get(row.id_phong) ?? [];
    list.push(row);
    messagesByRoom.set(row.id_phong, list);
  }

  const studentByRoom = new Map<string, string>();
  for (const room of roomList) {
    const studentUserId = resolveStudentUserIdForOrgRoom(
      membersByRoom.get(room.id) ?? [],
      messagesByRoom.get(room.id) ?? [],
    );
    if (studentUserId) {
      studentByRoom.set(room.id, studentUserId);
    }
  }

  const studentIds = [...new Set(studentByRoom.values())];
  const profileById = new Map<
    string,
    {
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
      giai_doan: string | null;
    }
  >();

  if (studentIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
      .in("id", studentIds)
      .returns<
        Array<{
          id: string;
          slug: string;
          ten_hien_thi: string | null;
          avatar_id: string | null;
          giai_doan: string | null;
        }>
      >();
    for (const profile of profiles ?? []) {
      profileById.set(profile.id, profile);
    }
  }

  const orgVaiTroByUserId = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: orgMembers } = await admin
      .from("user_thanh_vien_to_chuc")
      .select("id_nguoi_dung, vai_tro")
      .eq("id_to_chuc", orgId)
      .eq("trang_thai", "active")
      .in("id_nguoi_dung", studentIds)
      .returns<Array<{ id_nguoi_dung: string; vai_tro: string }>>();

    for (const row of orgMembers ?? []) {
      if (!orgVaiTroByUserId.has(row.id_nguoi_dung)) {
        orgVaiTroByUserId.set(row.id_nguoi_dung, row.vai_tro);
      }
    }
  }

  await Promise.all(
    roomIds.map((roomId) => ensureStaffOrgRoomMember(admin, roomId, staffUserId)),
  );

  const { data: reads } = roomIds.length
    ? await admin
        .from("chat_da_doc")
        .select("id_phong, id_tin_nhan_cuoi_doc")
        .eq("id_nguoi_dung", staffUserId)
        .in("id_phong", roomIds)
        .returns<Array<{ id_phong: string; id_tin_nhan_cuoi_doc: string }>>()
    : { data: [] as Array<{ id_phong: string; id_tin_nhan_cuoi_doc: string }> };

  const readAtByRoom = new Map<string, string>();
  const readMessageIds = [
    ...new Set((reads ?? []).map((row) => row.id_tin_nhan_cuoi_doc)),
  ];
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

  const byStudent = new Map<string, OrgInboxThread>();
  for (const room of roomList) {
    const studentUserId = studentByRoom.get(room.id);
    if (!studentUserId) continue;

    const profile = profileById.get(studentUserId);
    const studentName =
      profile?.ten_hien_thi?.trim() || profile?.slug?.trim() || "User";
    const giaiDoan = (profile?.giai_doan as GiaiDoan | null) ?? null;
    const contact = resolveOrgInboxContact(
      orgVaiTroByUserId.get(studentUserId) ?? null,
      giaiDoan,
    );
    const thread = buildInboxThread({
      roomId: room.id,
      studentUserId,
      studentName,
      studentSlug: profile?.slug ?? "",
      studentAvatarUrl: getAvatarUrl(profile?.avatar_id ?? null),
      studentContactLabel: contact.label,
      studentContactRole: contact.roleKey,
      studentRole: giaiDoan
        ? getGiaiDoanLabel(giaiDoan)
        : "Thành viên CINs",
      roomMessages: messagesByRoom.get(room.id) ?? [],
      staffUserId,
      readAt: readAtByRoom.get(room.id) ?? null,
    });
    if (!thread) continue;

    const existing = byStudent.get(studentUserId);
    if (
      !existing ||
      new Date(thread.lastAt).getTime() >= new Date(existing.lastAt).getTime()
    ) {
      byStudent.set(studentUserId, thread);
    }
  }

  const verifyResult = await listOrgMembershipMilestoneRequests(orgId, staffUserId);
  if (verifyResult.ok) {
    const pendingItems = verifyResult.items.filter(
      (item) => item.status === "pending",
    );

    for (const request of pendingItems) {
      const existing = byStudent.get(request.studentUserId);
      if (existing) {
        existing.pendingVerification = request;
        if (
          new Date(request.submittedAt).getTime() >
          new Date(existing.lastAt).getTime()
        ) {
          existing.lastAt = request.submittedAt;
        }
        continue;
      }

      const roomId = await findOrCreateOrgStudentRoom(orgId, request.studentUserId);
      await ensureStaffOrgRoomMember(admin, roomId, staffUserId);
      const contactMeta = await resolveStudentContactMeta(
        admin,
        orgId,
        request.studentUserId,
      );

      byStudent.set(
        request.studentUserId,
        buildInboxThreadFromVerification({
          roomId,
          request: {
            ...request,
            studentName: request.studentName || contactMeta.studentName,
            studentSlug: request.studentSlug || contactMeta.studentSlug,
            studentAvatarUrl:
              request.studentAvatarUrl ?? contactMeta.studentAvatarUrl,
          },
          studentContactLabel: contactMeta.studentContactLabel,
          studentContactRole: contactMeta.studentContactRole,
          studentRole: contactMeta.studentRole,
        }),
      );
    }
  }

  const threads = [...byStudent.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  await enrichOrgInboxThreadsOps(admin, orgId, threads);

  return { ok: true, threads };
}

/** Gắn ghi danh + cờ đơn HP chờ TT cho inbox staff. */
async function enrichOrgInboxThreadsOps(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  threads: OrgInboxThread[],
): Promise<void> {
  if (threads.length === 0) return;

  const studentIds = [...new Set(threads.map((t) => t.studentUserId))];

  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc")
    .eq("id_to_chuc", orgId)
    .returns<Array<{ id: string; ten_khoa_hoc: string }>>();

  const khoaIds = (khoaRows ?? []).map((k) => k.id);
  const khoaTenById = new Map(
    (khoaRows ?? []).map((k) => [k.id, k.ten_khoa_hoc] as const),
  );

  if (khoaIds.length === 0) {
    for (const thread of threads) {
      thread.enrollments = [];
      thread.pendingDonHocPhi = false;
    }
    return;
  }

  const { data: hvlRows } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung, id_khoa_hoc, id_lop_hoc")
    .in("id_khoa_hoc", khoaIds)
    .in("id_nguoi_dung", studentIds)
    .returns<
      Array<{
        id: string;
        id_nguoi_dung: string;
        id_khoa_hoc: string;
        id_lop_hoc: string | null;
      }>
    >();

  const lopIds = [
    ...new Set(
      (hvlRows ?? [])
        .map((r) => r.id_lop_hoc)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const maLopById = new Map<string, string | null>();
  if (lopIds.length > 0) {
    const { data: lopRows } = await admin
      .from("org_lop_hoc")
      .select("id, ma_lop")
      .in("id", lopIds)
      .returns<Array<{ id: string; ma_lop: string | null }>>();
    for (const lop of lopRows ?? []) {
      maLopById.set(lop.id, lop.ma_lop);
    }
  }

  const enrollmentsByUser = new Map<string, OrgInboxThread["enrollments"]>();
  const hvlIds: string[] = [];
  for (const row of hvlRows ?? []) {
    hvlIds.push(row.id);
    const list = enrollmentsByUser.get(row.id_nguoi_dung) ?? [];
    list.push({
      hocVienLopId: row.id,
      khoaId: row.id_khoa_hoc,
      tenKhoa: khoaTenById.get(row.id_khoa_hoc)?.trim() || "Khóa học",
      lopId: row.id_lop_hoc,
      maLop: row.id_lop_hoc
        ? maLopById.get(row.id_lop_hoc)?.trim() || null
        : null,
    });
    enrollmentsByUser.set(row.id_nguoi_dung, list);
  }

  const pendingUserIds = new Set<string>();
  if (hvlIds.length > 0) {
    const { data: donRows } = await admin
      .from("org_don_hoc_phi")
      .select("id_hoc_vien_lop")
      .eq("id_to_chuc", orgId)
      .eq("trang_thai", "cho_thanh_toan")
      .in("id_hoc_vien_lop", hvlIds)
      .returns<Array<{ id_hoc_vien_lop: string }>>();

    const hvlToUser = new Map(
      (hvlRows ?? []).map((r) => [r.id, r.id_nguoi_dung] as const),
    );
    for (const don of donRows ?? []) {
      const uid = hvlToUser.get(don.id_hoc_vien_lop);
      if (uid) pendingUserIds.add(uid);
    }
  }

  for (const thread of threads) {
    thread.enrollments = enrollmentsByUser.get(thread.studentUserId) ?? [];
    thread.pendingDonHocPhi = pendingUserIds.has(thread.studentUserId);
  }
}

export async function listOrgStudentMessagesForStaff(params: {
  orgId: string;
  studentUserId: string;
  staffUserId: string;
  /** Phòng đang chọn trên list — ưu tiên hơn canonical để tránh lệch preview/detail. */
  roomId?: string | null;
  markRead?: boolean;
}): Promise<
  | { ok: true; roomId: string; messages: ChatMessage[] }
  | { ok: false; error: string }
> {
  if (!(await canReviewOrgMilestoneTags(params.orgId, params.staffUserId))) {
    return { ok: false, error: "Không có quyền nhắn tin." };
  }

  try {
    const admin = createServiceRoleClient();
    let roomId = params.roomId?.trim() || "";

    if (roomId) {
      const { data: room } = await admin
        .from("chat_phong")
        .select("id, loai_phong, id_org_dai_dien")
        .eq("id", roomId)
        .maybeSingle<{
          id: string;
          loai_phong: string;
          id_org_dai_dien: string | null;
        }>();

      const { data: studentMember } = await admin
        .from("chat_thanh_vien")
        .select("id")
        .eq("id_phong", roomId)
        .eq("id_nguoi_dung", params.studentUserId)
        .is("roi_luc", null)
        .maybeSingle<{ id: string }>();

      if (
        !room ||
        room.loai_phong !== ORG_ROOM ||
        room.id_org_dai_dien !== params.orgId ||
        !studentMember?.id
      ) {
        roomId = "";
      }
    }

    if (!roomId) {
      roomId = await findOrCreateOrgStudentRoom(
        params.orgId,
        params.studentUserId,
      );
    }

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

    if (params.markRead !== false && chronological.length > 0) {
      await ensureStaffOrgRoomMember(admin, roomId, params.staffUserId);
      await markRoomRead(
        roomId,
        params.staffUserId,
        chronological[chronological.length - 1]!.id,
      );
    }

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
  body?: string;
  cloudflareImageId?: string;
  emojiMucId?: string;
  /** Phòng đang mở trên inbox — tránh gửi lệch phòng khác cùng cặp org↔HV. */
  roomId?: string | null;
  replyToId?: string | null;
}): Promise<
  | { ok: true; roomId: string; message: ChatMessage }
  | { ok: false; error: string }
> {
  const text = params.body?.trim() ?? "";
  const cloudflareImageId = params.cloudflareImageId?.trim();
  const emojiMucId = params.emojiMucId?.trim();
  const replyToId = params.replyToId?.trim() || undefined;

  if (!text && !cloudflareImageId && !emojiMucId) {
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
    let roomId = params.roomId?.trim() || "";

    if (roomId) {
      const { data: room } = await admin
        .from("chat_phong")
        .select("id, loai_phong, id_org_dai_dien")
        .eq("id", roomId)
        .maybeSingle<{
          id: string;
          loai_phong: string;
          id_org_dai_dien: string | null;
        }>();

      const { data: studentMember } = await admin
        .from("chat_thanh_vien")
        .select("id")
        .eq("id_phong", roomId)
        .eq("id_nguoi_dung", params.studentUserId)
        .is("roi_luc", null)
        .maybeSingle<{ id: string }>();

      if (
        !room ||
        room.loai_phong !== ORG_ROOM ||
        room.id_org_dai_dien !== params.orgId ||
        !studentMember?.id
      ) {
        roomId = "";
      }
    }

    if (!roomId) {
      roomId = await findOrCreateOrgStudentRoom(
        params.orgId,
        params.studentUserId,
      );
    }

    await ensureStaffOrgRoomMember(admin, roomId, params.staffUserId);

    const { sendRoomMessage } = await import("@/lib/chat/direct-message");
    const result = await sendRoomMessage(roomId, params.staffUserId, {
      body: text,
      cloudflareImageId,
      emojiMucId,
      replyToId,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, roomId, message: result.message };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không gửi được tin nhắn.",
    };
  }
}

/**
 * Mở (hoặc tạo) phòng chat giữa 1 USER và 1 ORG khi user chủ động nhắn tin.
 * KHÔNG chèn card ngữ cảnh ở đây — card chỉ là "chờ" phía client, được gửi kèm
 * tin nhắn đầu tiên khi user thực sự gửi. Dùng chung mô hình phòng `1_org`.
 */
export async function openUserOrgRoom(
  orgId: string,
  viewerId: string,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, ten, loai_to_chuc, avatar_id")
    .eq("id", orgId)
    .maybeSingle<OrgRow>();

  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy tổ chức." };
  }

  let roomId: string;
  try {
    roomId = await findOrCreateOrgStudentRoom(orgId, viewerId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không mở được hội thoại.",
    };
  }

  const now = new Date().toISOString();

  const { data: last } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<MessageRow>();

  const thread = buildOrgThread(
    roomId,
    org,
    last ? messagePreview(last) : "Bắt đầu trò chuyện",
    last?.tao_luc ?? now,
    0,
  );

  return { ok: true, thread: { ...thread, messages: [] } };
}

function buildLopThread(
  roomId: string,
  org: OrgRow,
  lopId: string,
  tenPhong: string,
  preview: string,
  lastAt: string,
  unread: number,
  parentRoomId?: string | null,
  roomAvatarId?: string | null,
): ChatThread {
  const orgKind = mapOrgLoai(org.loai_to_chuc);
  const name = tenPhong.trim() || org.ten?.trim() || "Lớp học";
  return {
    id: roomId,
    roomId,
    orgId: org.id,
    lopHocId: lopId,
    parentRoomId: parentRoomId ?? null,
    name,
    group: "to_chuc",
    kind: "org",
    orgKind,
    verified: true,
    role: "Phòng học của lớp",
    avatarInitial: avatarInitialFromName(name),
    avatarHue: avatarHueFromSeed(lopId),
    // Thumbnail riêng phòng lớp; fallback logo org.
    avatarUrl: getAvatarUrl(roomAvatarId ?? org.avatar_id),
    preview,
    lastAt,
    unread,
    messages: [],
  };
}

export async function listOrgThreadsForUser(viewerId: string): Promise<ChatThread[]> {
  const admin = createServiceRoleClient();
  const { isCoSoStaffRole } = await import("@/lib/to-chuc/co-so-vai-tro");
  const {
    ensureStaffMemberInLopRoom,
    backfillLopRoomsParentHub,
  } = await import("@/lib/co-so/lop-chat-phong");
  const {
    CSDT_HUB_CONTEXT,
    ensureOrgHubPhong,
  } = await import("@/lib/co-so/org-hub-phong");

  const { data: membershipsWithRole } = await admin
    .from("chat_thanh_vien")
    .select(
      "id_phong, vai_tro, chat_phong!inner(id, loai_phong, loai_context, id_org_dai_dien, id_context, id_phong_cha, ten_phong, avatar_id, cap_nhat_luc)",
    )
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .in("chat_phong.loai_phong", [ORG_ROOM, LOP_ROOM]);

  type RoomMeta = {
    loai_phong?: string;
    loai_context?: string | null;
    id_org_dai_dien?: string | null;
    id_context?: string | null;
    id_phong_cha?: string | null;
    ten_phong?: string | null;
    avatar_id?: string | null;
    cap_nhat_luc?: string | null;
  };

  const rows = membershipsWithRole ?? [];
  const hubRows = rows.filter((r) => {
    const room = r.chat_phong as RoomMeta | null;
    return (
      room?.loai_phong === ORG_ROOM && room.loai_context === CSDT_HUB_CONTEXT
    );
  });
  // Tư vấn 1_org: phía user (thanh_vien), không gồm hub.
  const orgStudentRows = rows.filter((r) => {
    const room = r.chat_phong as RoomMeta | null;
    return (
      room?.loai_phong === ORG_ROOM &&
      room.loai_context !== CSDT_HUB_CONTEXT &&
      r.vai_tro === "thanh_vien"
    );
  });
  const lopRowsFromMembership = rows.filter((r) => {
    const room = r.chat_phong as RoomMeta | null;
    return room?.loai_phong === LOP_ROOM;
  });

  const { data: staffMemberships } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc, vai_tro")
    .eq("id_nguoi_dung", viewerId)
    .eq("trang_thai", "active");

  const staffOrgIds = [
    ...new Set(
      (staffMemberships ?? [])
        .filter((m) => isCoSoStaffRole(m.vai_tro as string))
        .map((m) => m.id_to_chuc as string)
        .filter(Boolean),
    ),
  ];

  // Staff / HV: đảm bảo hub tồn tại + membership.
  const hubEnsureOrgs = [
    ...new Set([
      ...staffOrgIds,
      ...hubRows
        .map((r) => (r.chat_phong as RoomMeta | null)?.id_org_dai_dien)
        .filter((id): id is string => Boolean(id)),
      ...lopRowsFromMembership
        .map((r) => (r.chat_phong as RoomMeta | null)?.id_org_dai_dien)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];
  await Promise.all(
    hubEnsureOrgs.map(async (orgId) => {
      await ensureOrgHubPhong(orgId).catch(() => undefined);
      await backfillLopRoomsParentHub(orgId).catch(() => undefined);
    }),
  );

  type LopRoomRow = {
    id: string;
    id_org_dai_dien: string | null;
    id_context: string | null;
    id_phong_cha: string | null;
    ten_phong: string | null;
    avatar_id: string | null;
    cap_nhat_luc: string | null;
  };

  let staffLopRooms: LopRoomRow[] = [];
  if (staffOrgIds.length > 0) {
    const { data: rooms } = await admin
      .from("chat_phong")
      .select(
        "id, id_org_dai_dien, id_context, id_phong_cha, ten_phong, avatar_id, cap_nhat_luc",
      )
      .eq("loai_phong", LOP_ROOM)
      .in("id_org_dai_dien", staffOrgIds)
      .returns<LopRoomRow[]>();
    staffLopRooms = rooms ?? [];

    const alreadyMember = new Set(
      lopRowsFromMembership.map((r) => r.id_phong as string),
    );
    await Promise.all(
      staffLopRooms
        .filter((r) => r.id && !alreadyMember.has(r.id))
        .map((r) =>
          ensureStaffMemberInLopRoom(r.id_org_dai_dien!, r.id, viewerId),
        ),
    );
  }

  // Reload hub memberships sau ensure (staff mới join).
  let hubRowsFinal = hubRows;
  if (hubEnsureOrgs.length > 0) {
    const { data: hubMemberships } = await admin
      .from("chat_thanh_vien")
      .select(
        "id_phong, vai_tro, chat_phong!inner(id, loai_phong, loai_context, id_org_dai_dien, id_context, id_phong_cha, ten_phong, avatar_id, cap_nhat_luc)",
      )
      .eq("id_nguoi_dung", viewerId)
      .is("roi_luc", null)
      .eq("chat_phong.loai_phong", ORG_ROOM)
      .eq("chat_phong.loai_context", CSDT_HUB_CONTEXT);
    hubRowsFinal = hubMemberships ?? [];
  }

  const lopRows = [
    ...lopRowsFromMembership,
    ...staffLopRooms
      .filter(
        (r) => !lopRowsFromMembership.some((m) => m.id_phong === r.id),
      )
      .map((r) => ({
        id_phong: r.id,
        vai_tro: "admin",
        chat_phong: {
          loai_phong: LOP_ROOM,
          loai_context: "lop_hoc",
          id_org_dai_dien: r.id_org_dai_dien,
          id_context: r.id_context,
          id_phong_cha: r.id_phong_cha,
          ten_phong: r.ten_phong,
          avatar_id: r.avatar_id,
          cap_nhat_luc: r.cap_nhat_luc ?? undefined,
        } satisfies RoomMeta,
      })),
  ];

  const roomIds = [
    ...new Set(
      [...hubRowsFinal, ...orgStudentRows, ...lopRows].map(
        (row) => row.id_phong as string,
      ),
    ),
  ];
  if (roomIds.length === 0) return [];

  const orgIds = [
    ...new Set(
      [...hubRowsFinal, ...orgStudentRows, ...lopRows]
        .map((row) => {
          const room = row.chat_phong as RoomMeta | null;
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

  const orgThreads: ChatThread[] = [];
  const seenOrgRooms = new Set<string>();

  for (const row of hubRowsFinal) {
    const roomId = row.id_phong as string;
    if (seenOrgRooms.has(roomId)) continue;
    seenOrgRooms.add(roomId);
    const room = row.chat_phong as RoomMeta | null;
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
    orgThreads.push(
      buildOrgThread(
        roomId,
        org,
        last ? messagePreview(last as MessageRow) : "Phòng chat cơ sở",
        last?.tao_luc ?? room?.cap_nhat_luc ?? new Date(0).toISOString(),
        unread,
        { isOrgHub: true },
      ),
    );
  }

  for (const row of orgStudentRows) {
    const roomId = row.id_phong as string;
    if (seenOrgRooms.has(roomId)) continue;
    seenOrgRooms.add(roomId);
    const room = row.chat_phong as RoomMeta | null;
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
    orgThreads.push(
      buildOrgThread(
        roomId,
        org,
        last ? messagePreview(last as MessageRow) : "Tin nhắn từ tổ chức",
        last?.tao_luc ?? room?.cap_nhat_luc ?? new Date(0).toISOString(),
        unread,
      ),
    );
  }

  const hubIdByOrg = new Map<string, string>();
  for (const t of orgThreads) {
    if (t.isOrgHub && t.orgId) hubIdByOrg.set(t.orgId, t.roomId);
  }

  const lopThreads: ChatThread[] = [];
  const seenLopRooms = new Set<string>();

  for (const row of lopRows) {
    const roomId = row.id_phong as string;
    if (seenLopRooms.has(roomId)) continue;
    seenLopRooms.add(roomId);

    const room = row.chat_phong as RoomMeta | null;
    const orgId = room?.id_org_dai_dien;
    const lopId = room?.id_context;
    if (!orgId || !lopId) continue;
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

    const parentRoomId =
      room?.id_phong_cha?.trim() || hubIdByOrg.get(orgId) || null;

    lopThreads.push(
      buildLopThread(
        roomId,
        org,
        lopId,
        room?.ten_phong || "Lớp học",
        last ? messagePreview(last as MessageRow) : "Phòng học của lớp",
        last?.tao_luc ?? room?.cap_nhat_luc ?? new Date(0).toISOString(),
        unread,
        parentRoomId,
        room?.avatar_id,
      ),
    );
  }

  const dedupedOrg = dedupeOrgThreadsByOrg(orgThreads);
  const merged = [...dedupedOrg, ...lopThreads];
  merged.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  return merged;
}

export async function listAllChatThreads(viewerId: string): Promise<ChatThread[]> {
  const { listGroupThreads } = await import("@/lib/chat/group-message");
  const { getBanHangEnabled } = await import("@/lib/shop/settings");
  const { listShopKhachHang } = await import("@/lib/shop/khach-hang");

  const banHangBat = await getBanHangEnabled(viewerId);
  const [direct, group, org, khachMap] = await Promise.all([
    listDirectThreads(viewerId),
    listGroupThreads(viewerId),
    listOrgThreadsForUser(viewerId),
    // Overlay chỉ cho seller — buyer/user thường không query shop.
    // Bất biến: viewerId === sellerId (caller luôn truyền session.profile.id).
    banHangBat ? listShopKhachHang(viewerId) : Promise.resolve(null),
  ]);
  const merged = [...direct, ...group, ...org];
  if (khachMap && khachMap.size > 0) {
    for (const thread of merged) {
      if (
        thread.kind !== "user" ||
        thread.isGroup ||
        thread.isSelf ||
        !thread.peerUserId
      ) {
        continue;
      }
      const khach = khachMap.get(thread.peerUserId);
      if (!khach) continue;
      thread.isKhachHang = true;
      thread.khachHangSoDon = khach.soDon;
      thread.khachHangChiDonHuy = khach.chiDonHuy;
      thread.khachHangTagIds = khach.tagIds;
    }
  }
  merged.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
  return merged;
}
