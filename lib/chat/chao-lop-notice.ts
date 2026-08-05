/**
 * Tin hệ thống chào học viên mới vào phòng lớp
 * (`loai_tin=system`, `ngu_canh.loai=chao_lop`).
 */

import type { ChatChaoLopNotice } from "@/lib/chat/types";

export function parseChatChaoLop(raw: unknown): ChatChaoLopNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.loai !== "chao_lop") return null;
  const suKien = o.suKien === "join" || o.suKien === "welcome" ? o.suKien : "join";
  return { suKien };
}

/** Copy ấm cho HV được chào — tin gửi với id_nguoi_gui = HV mới. */
export function noiDungChaoLopChoHocVien(): string {
  return "Chào mừng bạn đến với lớp học!";
}

/**
 * Chỉ HV được chào (người gửi tin system) thấy card chào mừng.
 * Staff / HV khác không thấy — tránh nhiễu feed lớp.
 */
export function shouldShowChaoLopTin(input: {
  chaoLop: ChatChaoLopNotice | null | undefined;
  senderUserId: string | null | undefined;
  viewerId: string;
}): boolean {
  if (!input.chaoLop) return true;
  if (!input.senderUserId) return false;
  return input.senderUserId === input.viewerId;
}
