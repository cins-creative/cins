import "server-only";

import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ChatOrgKind, ChatReadCursor } from "@/lib/chat/types";

type ReadCursorRow = {
  id_nguoi_dung: string;
  id_tin_nhan_cuoi_doc: string | null;
};

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
};

type RoomMeta = {
  loai_phong: string;
  id_org_dai_dien: string | null;
};

type MemberRoleRow = {
  id_nguoi_dung: string;
  vai_tro: string;
};

type OrgFaceRow = {
  id: string;
  ten: string;
  slug: string;
  loai_to_chuc: string;
  avatar_id: string | null;
};

const ORG_ROOM = "1_org";

function mapOrgLoai(loai: string): ChatOrgKind | undefined {
  if (loai === "truong_dai_hoc") return "truong_dai_hoc";
  if (loai === "co_so_dao_tao") return "co_so_dao_tao";
  if (loai === "cong_dong") return "cong_dong";
  if (loai === "studio") return "studio";
  return undefined;
}

function resolveStudentUserId(members: MemberRoleRow[]): string | null {
  const student = members.find((m) => m.vai_tro === "thanh_vien");
  if (student) return student.id_nguoi_dung;
  const nonAdmin = members.find((m) => m.vai_tro !== "admin");
  return nonAdmin?.id_nguoi_dung ?? null;
}

/**
 * Cursor đã đọc của thành viên khác trong phòng (không gồm viewer).
 * Dùng watermark Messenger: avatar gắn đúng `messageId`.
 *
 * Phòng `1_org`: phía org (staff) hiện diện mạo tổ chức — không lộ avatar admin.
 * Nhiều staff đọc → gộp 1 cursor org tại watermark xa nhất.
 */
export async function listRoomReadCursors(
  roomId: string,
  viewerId: string,
): Promise<ChatReadCursor[]> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong, id_org_dai_dien")
    .eq("id", roomId)
    .maybeSingle<RoomMeta>();

  const { data: members } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung, vai_tro")
    .eq("id_phong", roomId)
    .is("roi_luc", null)
    .neq("id_nguoi_dung", viewerId)
    .returns<MemberRoleRow[]>();

  const memberIds = (members ?? [])
    .map((row) => row.id_nguoi_dung)
    .filter(Boolean);
  if (memberIds.length === 0) return [];

  const { data: readRows } = await admin
    .from("chat_da_doc")
    .select("id_nguoi_dung, id_tin_nhan_cuoi_doc")
    .eq("id_phong", roomId)
    .in("id_nguoi_dung", memberIds)
    .returns<ReadCursorRow[]>();

  const withMessage = (readRows ?? []).filter(
    (row): row is ReadCursorRow & { id_tin_nhan_cuoi_doc: string } =>
      Boolean(row.id_tin_nhan_cuoi_doc),
  );
  if (withMessage.length === 0) return [];

  const isOrgRoom =
    room?.loai_phong === ORG_ROOM && Boolean(room.id_org_dai_dien);

  if (!isOrgRoom) {
    return buildPersonalCursors(admin, withMessage);
  }

  const studentUserId = resolveStudentUserId(members ?? []);
  const studentRead = studentUserId
    ? withMessage.find((row) => row.id_nguoi_dung === studentUserId)
    : undefined;
  const staffReads = withMessage.filter(
    (row) => row.id_nguoi_dung !== studentUserId,
  );

  const cursors: ChatReadCursor[] = [];

  if (studentRead) {
    const personal = await buildPersonalCursors(admin, [studentRead]);
    cursors.push(...personal);
  }

  if (staffReads.length > 0 && room?.id_org_dai_dien) {
    const orgCursor = await buildOrgSideCursor(
      admin,
      room.id_org_dai_dien,
      staffReads,
    );
    if (orgCursor) cursors.push(orgCursor);
  }

  return cursors;
}

async function buildPersonalCursors(
  admin: ReturnType<typeof createServiceRoleClient>,
  rows: Array<ReadCursorRow & { id_tin_nhan_cuoi_doc: string }>,
): Promise<ChatReadCursor[]> {
  const userIds = rows.map((row) => row.id_nguoi_dung);
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds)
    .returns<ProfileRow[]>();

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const cursors: ChatReadCursor[] = [];
  for (const row of rows) {
    const profile = profileById.get(row.id_nguoi_dung);
    const name =
      profile?.ten_hien_thi?.trim() || profile?.slug?.trim() || "Thành viên";
    cursors.push({
      userId: row.id_nguoi_dung,
      messageId: row.id_tin_nhan_cuoi_doc,
      name,
      slug: profile?.slug?.trim() || undefined,
      avatarUrl: getAvatarUrl(profile?.avatar_id ?? null),
      initial: avatarInitialFromName(name),
      hue: avatarHueFromSeed(row.id_nguoi_dung),
    });
  }
  return cursors;
}

async function buildOrgSideCursor(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  staffReads: Array<ReadCursorRow & { id_tin_nhan_cuoi_doc: string }>,
): Promise<ChatReadCursor | null> {
  const messageIds = [
    ...new Set(staffReads.map((row) => row.id_tin_nhan_cuoi_doc)),
  ];

  const [{ data: org }, { data: messages }] = await Promise.all([
    admin
      .from("org_to_chuc")
      .select("id, ten, slug, loai_to_chuc, avatar_id")
      .eq("id", orgId)
      .maybeSingle<OrgFaceRow>(),
    admin
      .from("chat_tin_nhan")
      .select("id, tao_luc")
      .in("id", messageIds)
      .returns<Array<{ id: string; tao_luc: string }>>(),
  ]);

  if (!org) return null;

  const taoLucById = new Map(
    (messages ?? []).map((row) => [row.id, row.tao_luc]),
  );

  let furthest = staffReads[0]!;
  let furthestTime = -1;
  for (const row of staffReads) {
    const t = new Date(taoLucById.get(row.id_tin_nhan_cuoi_doc) ?? 0).getTime();
    if (t >= furthestTime) {
      furthestTime = t;
      furthest = row;
    }
  }

  const name = org.ten?.trim() || "Tổ chức";
  const orgKind = mapOrgLoai(org.loai_to_chuc);

  return {
    userId: `org:${orgId}`,
    messageId: furthest.id_tin_nhan_cuoi_doc,
    name,
    slug: org.slug?.trim() || undefined,
    avatarUrl: getAvatarUrl(org.avatar_id),
    initial: avatarInitialFromName(name),
    hue: avatarHueFromSeed(orgId),
    asOrg: true,
    orgKind,
  };
}
