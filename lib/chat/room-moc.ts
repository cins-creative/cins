import "server-only";

import { MAX_ROOM_MOCS } from "@/lib/chat/constants";
import { assertRoomMember } from "@/lib/chat/direct-message";
import {
  canManageGroupChat,
  normalizeGroupVaiTro,
} from "@/lib/chat/group-roles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ChatRoomMoc = {
  id: string;
  roomId: string;
  ten: string;
  moTa: string | null;
  thoiDiem: string;
  url: string | null;
  nhacTruocNgay: number;
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
  nhac_truoc_ngay: number;
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
    nhacTruocNgay: row.nhac_truoc_ngay,
    creatorUserId: row.id_nguoi_tao,
    taoLuc: row.tao_luc,
  };
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
    .select(
      "id, id_phong, ten, mo_ta, thoi_diem, url, nhac_truoc_ngay, id_nguoi_tao, tao_luc",
    )
    .eq("id_phong", roomId)
    .order("thoi_diem", { ascending: true })
    .limit(MAX_ROOM_MOCS);

  if (error) {
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
    nhacTruocNgay?: number;
  },
): Promise<{ ok: true; moc: ChatRoomMoc } | { ok: false; error: string }> {
  const gate = await assertCanManageMoc(roomId, viewerId);
  if (!gate.ok) return gate;

  const ten = input.ten.trim();
  if (!ten) return { ok: false, error: "Nhập tên mốc." };
  if (ten.length > 120) return { ok: false, error: "Tên mốc tối đa 120 ký tự." };

  const thoiDiem = input.thoiDiem.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(thoiDiem)) {
    return { ok: false, error: "Ngày mốc không hợp lệ." };
  }

  const url = input.url?.trim() || null;
  if (url && url.length > 2000) {
    return { ok: false, error: "URL quá dài." };
  }

  const nhac =
    typeof input.nhacTruocNgay === "number" && Number.isFinite(input.nhacTruocNgay)
      ? Math.max(0, Math.min(30, Math.floor(input.nhacTruocNgay)))
      : 1;

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
      nhac_truoc_ngay: nhac,
      id_nguoi_tao: viewerId,
    })
    .select(
      "id, id_phong, ten, mo_ta, thoi_diem, url, nhac_truoc_ngay, id_nguoi_tao, tao_luc",
    )
    .single();

  if (error || !data) {
    return { ok: false, error: "Không tạo được mốc." };
  }

  return { ok: true, moc: mapMoc(data) };
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
    nhacTruocNgay?: number;
  },
): Promise<{ ok: true; moc: ChatRoomMoc } | { ok: false; error: string }> {
  const gate = await assertCanManageMoc(roomId, viewerId);
  if (!gate.ok) return gate;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("chat_moc")
    .select("id")
    .eq("id", mocId)
    .eq("id_phong", roomId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Không tìm thấy mốc." };

  const patch: Record<string, unknown> = { cap_nhat_luc: new Date().toISOString() };

  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Nhập tên mốc." };
    patch.ten = ten;
  }
  if (input.moTa !== undefined) {
    patch.mo_ta = input.moTa?.trim() || null;
  }
  if (input.thoiDiem !== undefined) {
    const thoiDiem = input.thoiDiem.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(thoiDiem)) {
      return { ok: false, error: "Ngày mốc không hợp lệ." };
    }
    patch.thoi_diem = thoiDiem;
  }
  if (input.url !== undefined) {
    patch.url = input.url?.trim() || null;
  }
  if (input.nhacTruocNgay !== undefined) {
    patch.nhac_truoc_ngay = Math.max(
      0,
      Math.min(30, Math.floor(input.nhacTruocNgay)),
    );
  }

  const { data, error } = await admin
    .from("chat_moc")
    .update(patch)
    .eq("id", mocId)
    .select(
      "id, id_phong, ten, mo_ta, thoi_diem, url, nhac_truoc_ngay, id_nguoi_tao, tao_luc",
    )
    .single();

  if (error || !data) {
    return { ok: false, error: "Không cập nhật được mốc." };
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
