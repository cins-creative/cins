import "server-only";

import {
  canManageGroupChat,
  normalizeGroupVaiTro,
  type ChatGroupVaiTro,
} from "@/lib/chat/group-roles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CanvasRoomContext = {
  canvasId: string;
  roomId: string;
  trangThai: string;
  role: ChatGroupVaiTro;
  isAdmin: boolean;
};

/** Vai trò của viewer trong phòng; null nếu không còn là thành viên. */
export async function getRoomRole(
  roomId: string,
  viewerId: string,
): Promise<ChatGroupVaiTro | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (!data) return null;
  return normalizeGroupVaiTro(data.vai_tro);
}

/**
 * Nạp canvas + phòng + vai trò viewer trong một lượt, kèm guard thành viên.
 * Trả về null (kèm lý do) nếu không tìm thấy hoặc không có quyền.
 */
export async function loadCanvasContext(
  canvasId: string,
  viewerId: string,
): Promise<
  | { ok: true; ctx: CanvasRoomContext }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: canvas } = await admin
    .from("chat_canvas")
    .select("id, id_phong, trang_thai")
    .eq("id", canvasId)
    .maybeSingle<{ id: string; id_phong: string; trang_thai: string }>();

  if (!canvas) return { ok: false, error: "Không tìm thấy canvas." };

  const role = await getRoomRole(canvas.id_phong, viewerId);
  if (!role) return { ok: false, error: "Không có quyền." };

  return {
    ok: true,
    ctx: {
      canvasId: canvas.id,
      roomId: canvas.id_phong,
      trangThai: canvas.trang_thai,
      role,
      isAdmin: canManageGroupChat(role),
    },
  };
}

/**
 * Canvas khóa (trang_thai='khoa') chỉ owner/admin được ghi.
 * Trả về lỗi khi member thường cố chỉnh board đã khóa.
 */
export function assertCanvasWritable(
  ctx: CanvasRoomContext,
): { ok: true } | { ok: false; error: string } {
  if (ctx.trangThai === "khoa" && !ctx.isAdmin) {
    return { ok: false, error: "Canvas đang khóa — chỉ chủ nhóm/admin chỉnh được." };
  }
  return { ok: true };
}
