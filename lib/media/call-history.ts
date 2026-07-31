import "server-only";

import { assertRoomMember, mapMessageFromRow } from "@/lib/chat/direct-message";
import type { ChatMessage } from "@/lib/chat/types";
import {
  buildCuocGoiNguCanh,
  cuocGoiMessageBody,
  parseChatCuocGoi,
  type ChatCuocGoiTrangThai,
} from "@/lib/media/call-signal-types";
import type { MediaCallMode } from "@/lib/media/call-mode";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MESSAGE_COLS =
  "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc";

export async function insertCuocGoiDangGoi(input: {
  roomId: string;
  callerId: string;
  displayName: string;
  mode: MediaCallMode;
}): Promise<{ messageId: string; message: ChatMessage }> {
  await assertRoomMember(input.roomId, input.callerId);
  const batDau = new Date().toISOString();
  const notice = {
    mode: input.mode,
    trangThai: "dang_goi" as const,
    tenNguoiGoi: input.displayName,
    batDau,
  };
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_tin_nhan")
    .insert({
      id_phong: input.roomId,
      id_nguoi_gui: input.callerId,
      noi_dung: cuocGoiMessageBody(input.mode, "dang_goi"),
      loai_tin: "system",
      ngu_canh: buildCuocGoiNguCanh(notice),
    })
    .select(MESSAGE_COLS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Không ghi được tín hiệu cuộc gọi.");
  }

  return {
    messageId: data.id as string,
    message: mapMessageFromRow(data, input.callerId),
  };
}

async function loadCuocGoiRow(messageId: string, roomId: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_COLS)
    .eq("id", messageId)
    .eq("id_phong", roomId)
    .eq("loai_tin", "system")
    .eq("da_xoa", false)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy cuộc gọi.");
  const notice = parseChatCuocGoi(data.ngu_canh);
  if (!notice) throw new Error("Tin không phải tín hiệu cuộc gọi.");
  return { row: data, notice };
}

export async function updateCuocGoiTrangThai(input: {
  roomId: string;
  messageId: string;
  viewerId: string;
  trangThai: ChatCuocGoiTrangThai;
}): Promise<ChatMessage> {
  await assertRoomMember(input.roomId, input.viewerId);
  const { row, notice } = await loadCuocGoiRow(input.messageId, input.roomId);

  // Terminal states — không ghi đè.
  if (
    notice.trangThai === "ket_thuc" ||
    notice.trangThai === "nho" ||
    notice.trangThai === "tu_choi"
  ) {
    return mapMessageFromRow(row, input.viewerId);
  }

  const ketThuc = new Date().toISOString();
  let thoiLuongS: number | null = notice.thoiLuongS ?? null;
  let nextStatus = input.trangThai;

  if (input.trangThai === "dang_dien_ra") {
    if (notice.trangThai !== "dang_goi" && notice.trangThai !== "dang_dien_ra") {
      return mapMessageFromRow(row, input.viewerId);
    }
    nextStatus = "dang_dien_ra";
  } else if (input.trangThai === "ket_thuc") {
    if (notice.trangThai === "dang_goi") {
      // Caller hủy / hết chuông trước khi ai bắt → nhỡ.
      nextStatus = "nho";
    } else {
      nextStatus = "ket_thuc";
      const start = Date.parse(notice.thamGiaLuc || notice.batDau);
      thoiLuongS = Number.isFinite(start)
        ? Math.max(0, Math.floor((Date.now() - start) / 1000))
        : 0;
    }
  } else if (input.trangThai === "tu_choi" || input.trangThai === "nho") {
    if (notice.trangThai !== "dang_goi") {
      return mapMessageFromRow(row, input.viewerId);
    }
    nextStatus = input.trangThai;
  }

  const nextNotice = {
    ...notice,
    trangThai: nextStatus,
    thamGiaLuc:
      nextStatus === "dang_dien_ra" && !notice.thamGiaLuc
        ? ketThuc
        : notice.thamGiaLuc ?? null,
    ketThuc:
      nextStatus === "dang_dien_ra" ? notice.ketThuc ?? null : ketThuc,
    thoiLuongS: nextStatus === "ket_thuc" ? thoiLuongS : notice.thoiLuongS,
  };

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_tin_nhan")
    .update({
      noi_dung: cuocGoiMessageBody(
        nextNotice.mode,
        nextNotice.trangThai,
        nextNotice.thoiLuongS,
      ),
      ngu_canh: buildCuocGoiNguCanh(nextNotice),
      da_sua: true,
      sua_luc: ketThuc,
    })
    .eq("id", input.messageId)
    .eq("id_phong", input.roomId)
    .select(MESSAGE_COLS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Không cập nhật được cuộc gọi.");
  }

  return mapMessageFromRow(data, input.viewerId);
}
