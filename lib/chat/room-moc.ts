import "server-only";

import { MAX_ROOM_MOCS } from "@/lib/chat/constants";
import { assertRoomMember } from "@/lib/chat/direct-message";
import {
  canManageGroupChat,
  normalizeGroupVaiTro,
} from "@/lib/chat/group-roles";
import {
  notifyMocCreated,
  resetMocScheduleNotices,
} from "@/lib/chat/room-moc-notify";
import type { ChatMessage } from "@/lib/chat/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_REMIND_MINUTES = 30 * 24 * 60; // 30 ngày

export type ChatRoomMoc = {
  id: string;
  roomId: string;
  ten: string;
  moTa: string | null;
  thoiDiem: string;
  url: string | null;
  /** Số phút trước thoi_diem để nhắc. */
  nhacTruocPhut: number;
  creatorUserId: string;
  taoLuc: string;
};

function mapMoc(row: {
  id: string;
  id_phong: string;
  ten: string;
  mo_ta: string | null;
  thoi_diem: string;
  url: string | null;
  nhac_truoc_phut: number;
  id_nguoi_tao: string;
  tao_luc: string;
}): ChatRoomMoc {
  return {
    id: row.id,
    roomId: row.id_phong,
    ten: row.ten,
    moTa: row.mo_ta,
    thoiDiem: row.thoi_diem,
    url: row.url,
    nhacTruocPhut: row.nhac_truoc_phut,
    creatorUserId: row.id_nguoi_tao,
    taoLuc: row.tao_luc,
  };
}

const MOC_SELECT =
  "id, id_phong, ten, mo_ta, thoi_diem, url, nhac_truoc_phut, id_nguoi_tao, tao_luc";

/** Chuẩn hoá ngày hoặc datetime local/ISO → ISO timestamptz. */
export function normalizeMocThoiDiem(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (dateOnly) {
    const d = new Date(`${dateOnly[1]}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  const local = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (local) {
    const sec = local[4] ?? "00";
    const d = new Date(`${local[1]}T${local[2]}:${local[3]}:${sec}`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function clampRemindMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 1440;
  return Math.max(0, Math.min(MAX_REMIND_MINUTES, Math.floor(minutes)));
}

async function assertCanManageMoc(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("chat_thanh_vien")
    .select("vai_tro")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle<{ vai_tro: string }>();

  if (!canManageGroupChat(normalizeGroupVaiTro(membership?.vai_tro))) {
    return { ok: false, error: "Chỉ chủ nhóm hoặc admin mới quản lý mốc." };
  }
  return { ok: true };
}

export async function listRoomMocs(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true; mocs: ChatRoomMoc[] } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_moc")
    .select(MOC_SELECT)
    .eq("id_phong", roomId)
    .order("thoi_diem", { ascending: true })
    .limit(MAX_ROOM_MOCS);

  if (error) {
    const detail = error.message?.trim() || "";
    if (/nhac_truoc_phut|column .* does not exist/i.test(detail)) {
      return {
        ok: false,
        error:
          "DB chưa cập nhật cột mốc. Chạy migration_chat_moc_datetime.sql.",
      };
    }
    return { ok: false, error: "Không tải được mốc." };
  }

  return { ok: true, mocs: (data ?? []).map(mapMoc) };
}

export async function createRoomMoc(
  roomId: string,
  viewerId: string,
  input: {
    ten: string;
    moTa?: string | null;
    thoiDiem: string;
    url?: string | null;
    nhacTruocPhut?: number;
  },
): Promise<
  | { ok: true; moc: ChatRoomMoc; notice: ChatMessage | null }
  | { ok: false; error: string }
> {
  const gate = await assertCanManageMoc(roomId, viewerId);
  if (!gate.ok) return gate;

  const ten = input.ten.trim();
  if (!ten) return { ok: false, error: "Nhập tên mốc." };
  if (ten.length > 120) return { ok: false, error: "Tên mốc tối đa 120 ký tự." };

  const thoiDiem = normalizeMocThoiDiem(input.thoiDiem);
  if (!thoiDiem) {
    return { ok: false, error: "Thời điểm mốc không hợp lệ." };
  }

  const url = input.url?.trim() || null;
  if (url && url.length > 2000) {
    return { ok: false, error: "URL quá dài." };
  }

  const nhac =
    typeof input.nhacTruocPhut === "number"
      ? clampRemindMinutes(input.nhacTruocPhut)
      : 1440;

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("chat_moc")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId);

  if ((count ?? 0) >= MAX_ROOM_MOCS) {
    return { ok: false, error: `Tối đa ${MAX_ROOM_MOCS} mốc mỗi phòng.` };
  }

  const { data, error } = await admin
    .from("chat_moc")
    .insert({
      id_phong: roomId,
      ten,
      mo_ta: input.moTa?.trim() || null,
      thoi_diem: thoiDiem,
      url,
      nhac_truoc_phut: nhac,
      id_nguoi_tao: viewerId,
    })
    .select(MOC_SELECT)
    .single();

  if (error || !data) {
    const detail = error?.message?.trim() || "";
    if (/nhac_truoc_phut|column .* does not exist/i.test(detail)) {
      return {
        ok: false,
        error:
          "DB chưa cập nhật cột mốc (nhắc/giờ). Chạy migration_chat_moc_datetime.sql.",
      };
    }
    return {
      ok: false,
      error: detail ? `Không tạo được mốc: ${detail}` : "Không tạo được mốc.",
    };
  }

  const moc = mapMoc(data);
  const notice = await notifyMocCreated(moc.id, viewerId);
  return { ok: true, moc, notice };
}

export async function updateRoomMoc(
  roomId: string,
  mocId: string,
  viewerId: string,
  input: {
    ten?: string;
    moTa?: string | null;
    thoiDiem?: string;
    url?: string | null;
    nhacTruocPhut?: number;
  },
): Promise<{ ok: true; moc: ChatRoomMoc } | { ok: false; error: string }> {
  const gate = await assertCanManageMoc(roomId, viewerId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("chat_moc")
    .select("id, thoi_diem, nhac_truoc_phut")
    .eq("id", mocId)
    .eq("id_phong", roomId)
    .maybeSingle<{
      id: string;
      thoi_diem: string;
      nhac_truoc_phut: number;
    }>();

  if (!existing) return { ok: false, error: "Không tìm thấy mốc." };

  const patch: Record<string, unknown> = { cap_nhat_luc: new Date().toISOString() };
  let scheduleChanged = false;

  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Nhập tên mốc." };
    patch.ten = ten;
  }
  if (input.moTa !== undefined) {
    patch.mo_ta = input.moTa?.trim() || null;
  }
  if (input.thoiDiem !== undefined) {
    const thoiDiem = normalizeMocThoiDiem(input.thoiDiem);
    if (!thoiDiem) {
      return { ok: false, error: "Thời điểm mốc không hợp lệ." };
    }
    patch.thoi_diem = thoiDiem;
    if (thoiDiem !== new Date(existing.thoi_diem).toISOString()) {
      scheduleChanged = true;
    }
  }
  if (input.url !== undefined) {
    patch.url = input.url?.trim() || null;
  }
  if (input.nhacTruocPhut !== undefined) {
    const nhac = clampRemindMinutes(input.nhacTruocPhut);
    patch.nhac_truoc_phut = nhac;
    if (nhac !== existing.nhac_truoc_phut) scheduleChanged = true;
  }

  const { data, error } = await admin
    .from("chat_moc")
    .update(patch)
    .eq("id", mocId)
    .select(MOC_SELECT)
    .single();

  if (error || !data) {
    return { ok: false, error: "Không cập nhật được mốc." };
  }

  if (scheduleChanged) {
    await resetMocScheduleNotices(mocId);
  }

  return { ok: true, moc: mapMoc(data) };
}

export async function deleteRoomMoc(
  roomId: string,
  mocId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertCanManageMoc(roomId, viewerId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("chat_moc")
    .delete()
    .eq("id", mocId)
    .eq("id_phong", roomId);

  if (error) return { ok: false, error: "Không xóa được mốc." };
  return { ok: true };
}
