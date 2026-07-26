import "server-only";

import { isCloudflareImageId } from "@/lib/chat/image-url";
import { ensureOrgHubPhong } from "@/lib/co-so/org-hub-phong";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import { isCoSoStaffRole } from "@/lib/to-chuc/co-so-vai-tro";

const LOP_ROOM = "lop_hoc";
const STAFF_CHAT_ROLE = "admin";

type EnsureInput = {
  orgId: string;
  lopId: string;
  /** Tên hiển thị phòng (mã lớp / tên khóa). */
  tenPhong?: string | null;
  /** GV CINS → member admin phòng. */
  giaoVienUserId?: string | null;
};

type EnsureResult =
  | { ok: true; roomId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Đảm bảo lớp có phòng chat cố định `loai_phong=lop_hoc` và ghi `org_lop_hoc.id_chat_phong`.
 * Nest dưới hub CSĐT (`id_phong_cha`). Staff được join để hiện tab Tổ chức.
 */
export async function ensureLopChatPhong(
  input: EnsureInput,
): Promise<EnsureResult> {
  const admin = createServiceRoleClient();

  const hub = await ensureOrgHubPhong(input.orgId);
  const hubId = hub.ok ? hub.roomId : null;

  const { data: lop, error: lopErr } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop, id_chat_phong, giao_vien_phu_trach")
    .eq("id", input.lopId)
    .maybeSingle<{
      id: string;
      ma_lop: string;
      id_chat_phong: string | null;
      giao_vien_phu_trach: string | null;
    }>();

  if (lopErr || !lop) {
    return { ok: false, error: lopErr?.message ?? "Không tìm thấy lớp." };
  }

  let roomId = lop.id_chat_phong;
  let created = false;

  if (!roomId) {
    const ten =
      input.tenPhong?.trim() ||
      lop.ma_lop?.trim() ||
      "Lớp học";

    const insertRow: Record<string, unknown> = {
      loai_phong: LOP_ROOM,
      loai_context: "lop_hoc",
      id_context: input.lopId,
      id_org_dai_dien: input.orgId,
      ten_phong: ten.slice(0, 120),
      trang_thai: "active",
    };
    if (hubId) insertRow.id_phong_cha = hubId;

    const { data: room, error: roomErr } = await admin
      .from("chat_phong")
      .insert(insertRow)
      .select("id")
      .single<{ id: string }>();

    if (roomErr || !room?.id) {
      return {
        ok: false,
        error: roomErr?.message ?? "Không tạo được phòng chat lớp.",
      };
    }

    const { error: linkErr } = await admin
      .from("org_lop_hoc")
      .update({ id_chat_phong: room.id })
      .eq("id", input.lopId);

    if (linkErr) {
      return { ok: false, error: linkErr.message };
    }

    roomId = room.id;
    created = true;
  } else if (hubId) {
    await admin
      .from("chat_phong")
      .update({ id_phong_cha: hubId })
      .eq("id", roomId)
      .is("id_phong_cha", null);
  }

  const teacherId = input.giaoVienUserId ?? lop.giao_vien_phu_trach;
  await ensureOrgStaffAndTeacherMembers(admin, input.orgId, roomId, teacherId);

  return { ok: true, roomId, created };
}

/** Backfill phòng chat cho lớp thiếu `id_chat_phong` trong 1 org (cap để tránh timeout). */
export async function ensureMissingLopChatPhongForOrg(
  orgId: string,
  options?: { limit?: number },
): Promise<{ ensured: number; errors: number }> {
  const admin = createServiceRoleClient();
  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 80);

  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc")
    .eq("id_to_chuc", orgId);

  const khoaList = khoaRows ?? [];
  if (khoaList.length === 0) return { ensured: 0, errors: 0 };

  const khoaTenById = new Map(
    khoaList.map((k) => [k.id as string, (k.ten_khoa_hoc as string) ?? ""]),
  );
  const khoaIds = [...khoaTenById.keys()];

  const { data: lopRows } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop, id_khoa_hoc, giao_vien_phu_trach")
    .in("id_khoa_hoc", khoaIds)
    .is("id_chat_phong", null)
    .limit(limit);

  let ensured = 0;
  let errors = 0;
  for (const lop of lopRows ?? []) {
    const lopId = lop.id as string;
    const tenKhoa = khoaTenById.get(lop.id_khoa_hoc as string) ?? "";
    const ma = (lop.ma_lop as string | null)?.trim() ?? "";
    const result = await ensureLopChatPhong({
      orgId,
      lopId,
      tenPhong: `${tenKhoa} · ${ma}`.trim(),
      giaoVienUserId: (lop.giao_vien_phu_trach as string | null) ?? null,
    });
    if (result.ok) ensured += 1;
    else errors += 1;
  }

  // Phòng đã có: sync staff + gắn id_phong_cha → hub.
  await syncAllActiveStaffToAllLopChatRooms(orgId).catch(() => undefined);
  await backfillLopRoomsParentHub(orgId).catch(() => undefined);
  await ensureOrgHubPhong(orgId).catch(() => undefined);

  return { ensured, errors };
}

/** Gắn mọi phòng lớp của org vào hub nếu chưa có `id_phong_cha`. */
export async function backfillLopRoomsParentHub(
  orgId: string,
): Promise<number> {
  const hub = await ensureOrgHubPhong(orgId);
  if (!hub.ok) return 0;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_phong")
    .update({ id_phong_cha: hub.roomId })
    .eq("loai_phong", LOP_ROOM)
    .eq("id_org_dai_dien", orgId)
    .is("id_phong_cha", null)
    .select("id");
  if (error) return 0;
  return (data ?? []).length;
}

/**
 * Thêm 1 staff active vào mọi phòng lớp của cơ sở.
 * Gọi khi mời/accept thành viên (owner, admin, TV, GV, NV…).
 */
export async function syncStaffUserToAllLopChatRooms(
  orgId: string,
  userId: string,
): Promise<{ joined: number }> {
  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active");

  const isStaff = (membership ?? []).some((m) =>
    isCoSoStaffRole(m.vai_tro as string),
  );
  if (!isStaff) return { joined: 0 };

  const roomIds = await listLopRoomIdsForOrg(admin, orgId);
  if (roomIds.length === 0) return { joined: 0 };

  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id_phong")
    .eq("id_nguoi_dung", userId)
    .in("id_phong", roomIds)
    .is("roi_luc", null);

  const already = new Set(
    (existing ?? []).map((r) => r.id_phong as string).filter(Boolean),
  );
  const missing = roomIds.filter((id) => !already.has(id));
  if (missing.length === 0) return { joined: 0 };

  await insertRoomMembersBatched(
    admin,
    missing.map((id_phong) => ({
      id_phong,
      id_nguoi_dung: userId,
      vai_tro: STAFF_CHAT_ROLE,
    })),
  );
  return { joined: missing.length };
}

/** Sync mọi staff active của org vào mọi phòng lớp (idempotent). */
export async function syncAllActiveStaffToAllLopChatRooms(
  orgId: string,
): Promise<{ joined: number }> {
  const admin = createServiceRoleClient();
  const staffIds = await listActiveOrgStaffUserIds(admin, orgId);
  const roomIds = await listLopRoomIdsForOrg(admin, orgId);
  if (staffIds.length === 0 || roomIds.length === 0) {
    return { joined: 0 };
  }

  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, id_nguoi_dung")
    .in("id_phong", roomIds)
    .in("id_nguoi_dung", staffIds)
    .is("roi_luc", null);

  const have = new Set(
    (existing ?? []).map(
      (r) => `${r.id_phong as string}:${r.id_nguoi_dung as string}`,
    ),
  );

  const toInsert: Array<{
    id_phong: string;
    id_nguoi_dung: string;
    vai_tro: string;
  }> = [];
  for (const roomId of roomIds) {
    for (const userId of staffIds) {
      const key = `${roomId}:${userId}`;
      if (have.has(key)) continue;
      toInsert.push({
        id_phong: roomId,
        id_nguoi_dung: userId,
        vai_tro: STAFF_CHAT_ROLE,
      });
    }
  }

  if (toInsert.length === 0) return { joined: 0 };
  await insertRoomMembersBatched(admin, toInsert);
  return { joined: toInsert.length };
}

/**
 * Staff org chưa có membership → join admin (để list/send).
 * Dùng khi list thread hoặc mở phòng.
 */
export async function ensureStaffMemberInLopRoom(
  orgId: string,
  roomId: string,
  userId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active");

  const isStaff = (membership ?? []).some((m) =>
    isCoSoStaffRole(m.vai_tro as string),
  );
  if (!isStaff) return;

  await upsertRoomMember(admin, roomId, userId, STAFF_CHAT_ROLE);
}

export async function ensureLopChatPhongAndJoinStudent(input: {
  orgId: string;
  lopId: string;
  studentUserId: string;
  sendWelcome?: boolean;
}): Promise<
  | { ok: true; roomId: string; joined: boolean }
  | { ok: false; error: string }
> {
  const ensured = await ensureLopChatPhong({
    orgId: input.orgId,
    lopId: input.lopId,
  });
  if (!ensured.ok) return ensured;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", ensured.roomId)
    .eq("id_nguoi_dung", input.studentUserId)
    .is("roi_luc", null)
    .maybeSingle();

  let joined = false;
  if (!existing?.id) {
    const { error } = await admin.from("chat_thanh_vien").insert({
      id_phong: ensured.roomId,
      id_nguoi_dung: input.studentUserId,
      vai_tro: "thanh_vien",
    });
    if (error) return { ok: false, error: error.message };
    joined = true;
  }

  if (input.sendWelcome && joined) {
    await admin.from("chat_tin_nhan").insert({
      id_phong: ensured.roomId,
      id_nguoi_gui: input.studentUserId,
      loai_tin: "system",
      noi_dung: "Chào mừng học viên mới đến với lớp học.",
      ngu_canh: { loai: "chao_lop", suKien: "join" },
    });
  }

  return { ok: true, roomId: ensured.roomId, joined };
}

async function ensureOrgStaffAndTeacherMembers(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  roomId: string,
  teacherId: string | null | undefined,
): Promise<void> {
  const staffIds = await listActiveOrgStaffUserIds(admin, orgId);
  const memberIds = new Set(staffIds);
  if (teacherId) memberIds.add(teacherId);
  if (memberIds.size === 0) return;

  const userIds = [...memberIds];
  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .in("id_nguoi_dung", userIds)
    .is("roi_luc", null);

  const already = new Set(
    (existing ?? []).map((r) => r.id_nguoi_dung as string),
  );
  const missing = userIds.filter((id) => !already.has(id));
  if (missing.length === 0) return;

  await insertRoomMembersBatched(
    admin,
    missing.map((id_nguoi_dung) => ({
      id_phong: roomId,
      id_nguoi_dung,
      vai_tro: STAFF_CHAT_ROLE,
    })),
  );
}

async function listActiveOrgStaffUserIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung, vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active");

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (!isCoSoStaffRole(row.vai_tro as string)) continue;
    const uid = row.id_nguoi_dung as string | null;
    if (uid) ids.add(uid);
  }
  return [...ids];
}

async function listLopRoomIdsForOrg(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("chat_phong")
    .select("id")
    .eq("loai_phong", LOP_ROOM)
    .eq("id_org_dai_dien", orgId);
  return [...new Set((data ?? []).map((r) => r.id as string).filter(Boolean))];
}

/**
 * Đổi thumbnail phòng chat lớp (`chat_phong.avatar_id`) — đồng bộ list quản lý + tab chat.
 * Quyền: module khoa-lop `sua`.
 */
export async function setLopChatAvatar(params: {
  orgId: string;
  lopId: string;
  actorId: string;
  avatarId: string | null;
}): Promise<
  | { ok: true; roomId: string; avatarId: string | null }
  | { ok: false; error: string }
> {
  const vaiTro = await getViewerCoSoVaiTro(params.actorId, params.orgId);
  const quyen = await getCoSoModuleQuyen(
    params.orgId,
    params.actorId,
    vaiTro,
    "khoa-lop",
  );
  if (quyen !== "sua") {
    return { ok: false, error: "Không có quyền đổi ảnh lớp." };
  }

  const trimmed = params.avatarId?.trim() || null;
  if (trimmed && !isCloudflareImageId(trimmed)) {
    return { ok: false, error: "Ảnh không hợp lệ." };
  }

  const ensured = await ensureLopChatPhong({
    orgId: params.orgId,
    lopId: params.lopId,
  });
  if (!ensured.ok) return ensured;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("chat_phong")
    .update({ avatar_id: trimmed })
    .eq("id", ensured.roomId)
    .eq("loai_phong", LOP_ROOM);

  if (error) {
    return { ok: false, error: error.message || "Không lưu được ảnh lớp." };
  }

  return { ok: true, roomId: ensured.roomId, avatarId: trimmed };
}

async function insertRoomMembersBatched(
  admin: ReturnType<typeof createServiceRoleClient>,
  rows: Array<{ id_phong: string; id_nguoi_dung: string; vai_tro: string }>,
): Promise<void> {
  const CHUNK = 80;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await admin.from("chat_thanh_vien").insert(chunk);
  }
}

async function upsertRoomMember(
  admin: ReturnType<typeof createServiceRoleClient>,
  roomId: string,
  userId: string,
  vaiTro: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", userId)
    .is("roi_luc", null)
    .maybeSingle();
  if (existing?.id) return;
  await admin.from("chat_thanh_vien").insert({
    id_phong: roomId,
    id_nguoi_dung: userId,
    vai_tro: vaiTro,
  });
}
