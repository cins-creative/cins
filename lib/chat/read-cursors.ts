import "server-only";

import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ChatReadCursor } from "@/lib/chat/types";

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

/**
 * Cursor đã đọc của thành viên khác trong phòng (không gồm viewer).
 * Dùng watermark Messenger: avatar gắn đúng `messageId`.
 */
export async function listRoomReadCursors(
  roomId: string,
  viewerId: string,
): Promise<ChatReadCursor[]> {
  const admin = createServiceRoleClient();

  const { data: members } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null)
    .neq("id_nguoi_dung", viewerId);

  const memberIds = (members ?? [])
    .map((row) => row.id_nguoi_dung as string)
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

  const userIds = withMessage.map((row) => row.id_nguoi_dung);
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds)
    .returns<ProfileRow[]>();

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const cursors: ChatReadCursor[] = [];
  for (const row of withMessage) {
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
