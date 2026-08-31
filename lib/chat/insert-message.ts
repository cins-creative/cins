import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Bộ cột `chat_tin_nhan` khớp `MessageRow` — dùng cho các tin hệ thống cần map
 * ra `ChatMessage` ngay (bình chọn, mốc, cuộc gọi, canvas). Trước đây chuỗi này
 * bị chép lặp ở 4 file.
 */
export const CHAT_MESSAGE_ROW_COLS =
  "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc";

/**
 * **Một cửa ghi tin nhắn.** Mọi `INSERT public.chat_tin_nhan` phải đi qua đây.
 *
 * Lý do: trước đây có 3 nơi ghi thẳng (`sendRoomMessage`, tin chào lớp, card
 * phòng lớp trong đơn học phí). Khi thêm đường đẩy tin chủ động (broadcast —
 * Phase 2 của `docs/PLAN_kien_truc_tin_nhan.md`), nơi nào không đi qua cửa này
 * sẽ **không được đẩy** và chỉ tới bằng CDC/poll.
 *
 * Helper **không** làm side-effect nghiệp vụ (mark read, notify org, push FCM) —
 * những thứ đó vẫn thuộc `sendRoomMessage` để không đổi hành vi của các luồng
 * tin hệ thống.
 */
export async function insertChatMessageRow<T>(
  row: Record<string, unknown>,
  options: {
    /** Cột trả về (chuỗi select của PostgREST). */
    select: string;
    /**
     * Timestamp để bump `chat_phong.cap_nhat_luc`. **Bỏ trống = không bump** —
     * giữ đúng hành vi cũ của từng call-site.
     */
    bumpRoomAt?: string | null;
    admin?: ReturnType<typeof createServiceRoleClient>;
  },
): Promise<{ data: T | null; error: string | null }> {
  const admin = options.admin ?? createServiceRoleClient();

  const { data, error } = await admin
    .from("chat_tin_nhan")
    .insert(row)
    .select(options.select)
    .single<T>();

  if (error || !data) {
    return { data: null, error: error?.message ?? "INSERT_FAILED" };
  }

  const roomId = typeof row.id_phong === "string" ? row.id_phong : null;
  if (options.bumpRoomAt && roomId) {
    await admin
      .from("chat_phong")
      .update({ cap_nhat_luc: options.bumpRoomAt })
      .eq("id", roomId);
  }

  /* Phase 2: envelope — cờ tắt thì no-op. Không được làm fail INSERT. */
  try {
    const { publishChatEnvelopeFromInsertedRow } = await import(
      "@/lib/chat/publish"
    );
    publishChatEnvelopeFromInsertedRow(
      row,
      data as Record<string, unknown>,
    );
  } catch (err) {
    console.error("[insertChatMessageRow] publish", err);
  }

  return { data, error: null };
}
