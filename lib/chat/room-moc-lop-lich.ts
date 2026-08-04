import "server-only";

import { resolveNextLopHocSession } from "@/lib/cins/home-adaptive/lop-hoc-next";
import { assertCanManageMoc } from "@/lib/chat/room-moc-access";
import { normalizeMocNguon, type ChatMocNguon } from "@/lib/chat/room-moc-nguon";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const LOP_LICH_NHAC_PHUT = 15;

export type { ChatMocNguon };
export { normalizeMocNguon };

type LopRoomContext = {
  roomId: string;
  lopId: string;
  maLop: string | null;
  lichHoc: string | null;
  trangThai: string | null;
};

async function loadLopRoomContext(
  roomId: string,
): Promise<LopRoomContext | null> {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong, id_context")
    .eq("id", roomId)
    .maybeSingle<{
      id: string;
      loai_phong: string;
      id_context: string | null;
    }>();

  if (!room || room.loai_phong !== "lop_hoc" || !room.id_context) {
    return null;
  }

  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop, lich_hoc, trang_thai, id_chat_phong")
    .eq("id", room.id_context)
    .maybeSingle<{
      id: string;
      ma_lop: string | null;
      lich_hoc: string | null;
      trang_thai: string | null;
      id_chat_phong: string | null;
    }>();

  if (!lop) return null;

  return {
    roomId: room.id,
    lopId: lop.id,
    maLop: lop.ma_lop,
    lichHoc: lop.lich_hoc,
    trangThai: lop.trang_thai,
  };
}

async function findLichLopMoc(roomId: string): Promise<{ id: string } | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_moc")
    .select("id")
    .eq("id_phong", roomId)
    .eq("nguon", "lich_lop")
    .maybeSingle<{ id: string }>();
  return data ?? null;
}

/**
 * Cập nhật thoi_diem mốc lich_lop theo buổi kế tiếp.
 * Trả về null nếu không còn mốc / không parse được lịch.
 */
export async function syncLopHocLichMoc(roomId: string): Promise<{
  ok: boolean;
  error?: string;
  enabled?: boolean;
  thoiDiem?: string | null;
}> {
  const ctx = await loadLopRoomContext(roomId);
  if (!ctx) {
    return { ok: false, error: "Không phải phòng lớp học." };
  }

  const existing = await findLichLopMoc(roomId);
  if (!existing) {
    return { ok: true, enabled: false, thoiDiem: null };
  }

  if (ctx.trangThai === "huy") {
    return { ok: true, enabled: true, thoiDiem: null };
  }

  const next = resolveNextLopHocSession(ctx.lichHoc);
  if (!next.startAt) {
    return {
      ok: false,
      error: "Không đọc được lịch lớp — cập nhật lịch trước.",
      enabled: true,
    };
  }

  const admin = createServiceRoleClient();
  const moTa = ctx.lichHoc?.trim().slice(0, 500) || null;
  const ten = ctx.maLop?.trim()
    ? `Buổi học · ${ctx.maLop.trim()}`
    : "Buổi học";

  const { error } = await admin
    .from("chat_moc")
    .update({
      ten,
      mo_ta: moTa,
      thoi_diem: next.startAt,
      nhac_truoc_phut: LOP_LICH_NHAC_PHUT,
      loai_lap: "mot_lan",
      id_tin_nhac_truoc: null,
      id_tin_den_han: null,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    return { ok: false, error: "Không đồng bộ mốc lịch lớp." };
  }

  return { ok: true, enabled: true, thoiDiem: next.startAt };
}

/** Bật mốc nhắc 15' trước buổi học (upsert 1 hàng nguon=lich_lop). */
export async function enableLopHocLichMoc(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertCanManageMoc(roomId, viewerId);
  if (!gate.ok) return gate;

  const ctx = await loadLopRoomContext(roomId);
  if (!ctx) {
    return { ok: false, error: "Chỉ dùng cho phòng lớp học." };
  }
  if (ctx.trangThai === "huy") {
    return { ok: false, error: "Lớp đã tạm dừng / hủy." };
  }

  const next = resolveNextLopHocSession(ctx.lichHoc);
  if (!next.startAt) {
    return {
      ok: false,
      error: "Cập nhật lịch lớp (thứ + giờ) trước khi bật nhắc.",
    };
  }

  const admin = createServiceRoleClient();
  const existing = await findLichLopMoc(roomId);
  const moTa = ctx.lichHoc?.trim().slice(0, 500) || null;
  const ten = ctx.maLop?.trim()
    ? `Buổi học · ${ctx.maLop.trim()}`
    : "Buổi học";

  if (existing) {
    const { error } = await admin
      .from("chat_moc")
      .update({
        ten,
        mo_ta: moTa,
        thoi_diem: next.startAt,
        nhac_truoc_phut: LOP_LICH_NHAC_PHUT,
        loai_lap: "mot_lan",
        id_tin_nhac_truoc: null,
        id_tin_den_han: null,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "Không bật được nhắc lịch lớp." };
    return { ok: true };
  }

  const { error } = await admin.from("chat_moc").insert({
    id_phong: roomId,
    ten,
    mo_ta: moTa,
    thoi_diem: next.startAt,
    url: null,
    nhac_truoc_phut: LOP_LICH_NHAC_PHUT,
    loai_lap: "mot_lan",
    nguon: "lich_lop",
    id_nguoi_tao: viewerId,
  });

  if (error) {
    const detail = error.message?.trim() || "";
    if (/nguon|column .* does not exist/i.test(detail)) {
      return {
        ok: false,
        error: "DB chưa có cột nguon — chạy migration_chat_moc_nguon.sql.",
      };
    }
    return { ok: false, error: detail || "Không bật được nhắc lịch lớp." };
  }

  return { ok: true };
}

/** Tắt — xóa mốc nguon=lich_lop (không đụng mốc thủ công). */
export async function disableLopHocLichMoc(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertCanManageMoc(roomId, viewerId);
  if (!gate.ok) return gate;

  const ctx = await loadLopRoomContext(roomId);
  if (!ctx) {
    return { ok: false, error: "Chỉ dùng cho phòng lớp học." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("chat_moc")
    .delete()
    .eq("id_phong", roomId)
    .eq("nguon", "lich_lop");

  if (error) return { ok: false, error: "Không tắt được nhắc lịch lớp." };
  return { ok: true };
}

export async function getLopHocLichMocEnabled(
  roomId: string,
): Promise<boolean> {
  return Boolean(await findLichLopMoc(roomId));
}

/**
 * Sau den_han: nhảy thoi_diem sang buổi kế từ lich_hoc.
 * @returns ISO mới hoặc null nếu không advance.
 */
export async function advanceLichLopMocAfterDue(
  mocId: string,
  roomId: string,
  now: Date,
): Promise<string | null> {
  const ctx = await loadLopRoomContext(roomId);
  if (!ctx || ctx.trangThai === "huy") return null;

  const next = resolveNextLopHocSession(ctx.lichHoc, now.getTime());
  if (!next.startAt) return null;
  const startMs = Date.parse(next.startAt);
  if (!Number.isFinite(startMs) || startMs <= now.getTime()) return null;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("chat_moc")
    .update({
      thoi_diem: next.startAt,
      mo_ta: ctx.lichHoc?.trim().slice(0, 500) || null,
      nhac_truoc_phut: LOP_LICH_NHAC_PHUT,
      id_tin_nhac_truoc: null,
      id_tin_den_han: null,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", mocId)
    .eq("nguon", "lich_lop");

  if (error) {
    console.error("[lich-lop-moc] advance failed", error.message);
    return null;
  }
  return next.startAt;
}

/** Gọi khi PATCH lớp đổi lich_hoc — sync nếu đang bật. */
export async function syncLopHocLichMocForLopId(
  lopId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id_chat_phong")
    .eq("id", lopId)
    .maybeSingle<{ id_chat_phong: string | null }>();
  const roomId = lop?.id_chat_phong?.trim();
  if (!roomId) return;
  await syncLopHocLichMoc(roomId);
}
