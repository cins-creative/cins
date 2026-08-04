import "server-only";

import { assertRoomMember } from "@/lib/chat/direct-message";
import {
  canManageGroupChat,
  normalizeGroupVaiTro,
} from "@/lib/chat/group-roles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Quyền CRUD mốc / toggle lịch lớp — tách file tránh circular import. */
export async function assertCanManageMoc(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong")
    .eq("id", roomId)
    .maybeSingle<{ loai_phong: string }>();

  /* Chat 1-1: cả hai bạn đều tạo/sửa/xóa mốc. Nhóm + lớp: owner/admin. */
  if (room?.loai_phong === "1_1") {
    return { ok: true };
  }

  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (!canManageGroupChat(normalizeGroupVaiTro(membership?.vai_tro))) {
    return {
      ok: false,
      error:
        room?.loai_phong === "lop_hoc"
          ? "Chỉ admin phòng học mới quản lý mốc."
          : "Chỉ chủ nhóm hoặc admin mới quản lý mốc.",
    };
  }
  return { ok: true };
}
