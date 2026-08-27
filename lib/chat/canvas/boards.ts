import "server-only";

import { assertRoomMember } from "@/lib/chat/direct-message";
import { getRoomRole } from "@/lib/chat/canvas/access";
import type {
  CanvasCheDoSaoChep,
  CanvasResult,
  CanvasTrangThai,
  ChatCanvas,
} from "@/lib/chat/canvas/types";
import { canManageGroupChat } from "@/lib/chat/group-roles";
import { GROUP_ROOM, isGroupRoomId } from "@/lib/chat/group-message";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CANVAS_SELECT =
  "id, id_phong, ten, mo_ta, trang_thai, che_do_sao_chep, id_nguoi_tao, tao_luc, cap_nhat_luc";

type CanvasRow = {
  id: string;
  id_phong: string;
  ten: string;
  mo_ta: string | null;
  trang_thai: string;
  che_do_sao_chep?: string | null;
  id_nguoi_tao: string;
  tao_luc: string;
  cap_nhat_luc: string;
};

function mapCheDoSaoChep(raw: string | null | undefined): CanvasCheDoSaoChep {
  return raw === "public" ? "public" : "private";
}

function mapCanvas(row: CanvasRow): ChatCanvas {
  return {
    id: row.id,
    roomId: row.id_phong,
    ten: row.ten,
    moTa: row.mo_ta,
    trangThai: (["active", "khoa", "an"].includes(row.trang_thai)
      ? row.trang_thai
      : "active") as CanvasTrangThai,
    cheDoSaoChep: mapCheDoSaoChep(row.che_do_sao_chep),
    idNguoiTao: row.id_nguoi_tao,
    taoLuc: row.tao_luc,
    capNhatLuc: row.cap_nhat_luc,
  };
}

/**
 * Lấy board mặc định của phòng, tạo mới nếu chưa có.
 * MVP: 1 board/phòng — chọn board active cũ nhất, nếu không có thì tạo.
 */
export async function getOrCreateRoomCanvas(
  roomId: string,
  viewerId: string,
): Promise<CanvasResult<{ canvas: ChatCanvas }>> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("chat_canvas")
    .select(CANVAS_SELECT)
    .eq("id_phong", roomId)
    .neq("trang_thai", "an")
    .order("tao_luc", { ascending: true })
    .limit(1)
    .maybeSingle<CanvasRow>();

  if (existing) {
    /* 1-1 / không phải nhóm: luôn Public (không UI quyền). */
    if (
      existing.che_do_sao_chep !== "public" &&
      !(await isGroupRoomId(roomId))
    ) {
      const { data: fixed } = await admin
        .from("chat_canvas")
        .update({ che_do_sao_chep: "public" })
        .eq("id", existing.id)
        .select(CANVAS_SELECT)
        .maybeSingle<CanvasRow>();
      if (fixed) return { ok: true, canvas: mapCanvas(fixed) };
    }
    return { ok: true, canvas: mapCanvas(existing) };
  }

  const isGroup = await isGroupRoomId(roomId);
  const { data: created, error } = await admin
    .from("chat_canvas")
    .insert({
      id_phong: roomId,
      id_nguoi_tao: viewerId,
      /* Nhóm: private mặc định; 1-1 và phòng khác: luôn public. */
      che_do_sao_chep: isGroup ? "private" : "public",
    })
    .select(CANVAS_SELECT)
    .single<CanvasRow>();

  if (error || !created) {
    return { ok: false, error: "Không tạo được canvas." };
  }

  return { ok: true, canvas: mapCanvas(created) };
}

/** Danh sách board của phòng (v2 nhiều board). Ẩn ('an') không liệt kê. */
export async function listRoomCanvases(
  roomId: string,
  viewerId: string,
): Promise<CanvasResult<{ canvases: ChatCanvas[] }>> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_canvas")
    .select(CANVAS_SELECT)
    .eq("id_phong", roomId)
    .neq("trang_thai", "an")
    .order("tao_luc", { ascending: true });

  if (error) return { ok: false, error: "Không tải được canvas." };
  return { ok: true, canvases: (data ?? []).map((r) => mapCanvas(r as CanvasRow)) };
}

/** Đổi tên / mô tả board — mọi thành viên (trừ khi board khóa thì chỉ admin). */
export async function updateCanvasMeta(
  canvasId: string,
  viewerId: string,
  patch: { ten?: string; moTa?: string | null },
): Promise<CanvasResult<{ canvas: ChatCanvas }>> {
  const admin = createServiceRoleClient();
  const { data: canvas } = await admin
    .from("chat_canvas")
    .select("id, id_phong, trang_thai")
    .eq("id", canvasId)
    .maybeSingle<{ id: string; id_phong: string; trang_thai: string }>();

  if (!canvas) return { ok: false, error: "Không tìm thấy canvas." };

  const role = await getRoomRole(canvas.id_phong, viewerId);
  if (!role) return { ok: false, error: "Không có quyền." };
  if (canvas.trang_thai === "khoa" && !canManageGroupChat(role)) {
    return { ok: false, error: "Canvas đang khóa — chỉ chủ nhóm/admin chỉnh được." };
  }

  const update: Record<string, unknown> = {};
  if (patch.ten !== undefined) {
    const ten = patch.ten.trim();
    if (!ten) return { ok: false, error: "Nhập tên canvas." };
    if (ten.length > 80) return { ok: false, error: "Tên canvas tối đa 80 ký tự." };
    update.ten = ten;
  }
  if (patch.moTa !== undefined) {
    update.mo_ta = patch.moTa?.trim() || null;
  }
  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Không có thay đổi." };
  }

  const { data, error } = await admin
    .from("chat_canvas")
    .update(update)
    .eq("id", canvasId)
    .select(CANVAS_SELECT)
    .single<CanvasRow>();

  if (error || !data) return { ok: false, error: "Không cập nhật được canvas." };
  return { ok: true, canvas: mapCanvas(data) };
}

/** Khóa / mở khóa / ẩn board — chỉ owner/admin phòng. */
export async function setCanvasTrangThai(
  canvasId: string,
  viewerId: string,
  trangThai: CanvasTrangThai,
): Promise<CanvasResult<{ canvas: ChatCanvas }>> {
  const admin = createServiceRoleClient();
  const { data: canvas } = await admin
    .from("chat_canvas")
    .select("id, id_phong")
    .eq("id", canvasId)
    .maybeSingle<{ id: string; id_phong: string }>();

  if (!canvas) return { ok: false, error: "Không tìm thấy canvas." };

  const role = await getRoomRole(canvas.id_phong, viewerId);
  if (!role || !canManageGroupChat(role)) {
    return { ok: false, error: "Chỉ chủ nhóm/admin đổi trạng thái canvas." };
  }

  const { data, error } = await admin
    .from("chat_canvas")
    .update({ trang_thai: trangThai })
    .eq("id", canvasId)
    .select(CANVAS_SELECT)
    .single<CanvasRow>();

  if (error || !data) return { ok: false, error: "Không đổi được trạng thái." };
  return { ok: true, canvas: mapCanvas(data) };
}

/** Private / Public copy — chỉ owner/admin **phòng nhóm**. */
export async function setCanvasCheDoSaoChep(
  canvasId: string,
  viewerId: string,
  cheDoSaoChep: CanvasCheDoSaoChep,
): Promise<CanvasResult<{ canvas: ChatCanvas }>> {
  if (cheDoSaoChep !== "private" && cheDoSaoChep !== "public") {
    return { ok: false, error: "Chế độ sao chép không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { data: canvas } = await admin
    .from("chat_canvas")
    .select("id, id_phong")
    .eq("id", canvasId)
    .maybeSingle<{ id: string; id_phong: string }>();

  if (!canvas) return { ok: false, error: "Không tìm thấy canvas." };

  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong")
    .eq("id", canvas.id_phong)
    .maybeSingle<{ loai_phong: string }>();

  if (room?.loai_phong !== GROUP_ROOM) {
    return {
      ok: false,
      error: "Chỉ phòng nhóm mới đặt Private/Public.",
    };
  }

  const role = await getRoomRole(canvas.id_phong, viewerId);
  if (!role || !canManageGroupChat(role)) {
    return { ok: false, error: "Chỉ chủ nhóm/admin đổi chế độ sao chép." };
  }

  const { data, error } = await admin
    .from("chat_canvas")
    .update({ che_do_sao_chep: cheDoSaoChep })
    .eq("id", canvasId)
    .select(CANVAS_SELECT)
    .single<CanvasRow>();

  if (error || !data) {
    return { ok: false, error: "Không đổi được chế độ sao chép." };
  }
  return { ok: true, canvas: mapCanvas(data) };
}
