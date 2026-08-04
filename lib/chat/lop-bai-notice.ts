/**
 * Parse + filter tin pedagogy lớp — dùng chung server + realtime client.
 * Không import server-only.
 */

import type { ChatLopBaiNotice } from "@/lib/chat/types";

const LOP_BAI_LOAI = new Set([
  "mo_bai",
  "nop_bai",
  "luu_bai",
  "journey_da_dang",
]);

export function parseLopBaiNguCanh(raw: unknown): ChatLopBaiNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.loai !== "string" || !LOP_BAI_LOAI.has(o.loai)) return null;
  if (typeof o.idNguoiDung !== "string") return null;
  return {
    loai: o.loai as ChatLopBaiNotice["loai"],
    idNguoiDung: o.idNguoiDung,
    idHocVienLop:
      typeof o.idHocVienLop === "string" ? o.idHocVienLop : undefined,
    idBaiTap: typeof o.idBaiTap === "string" ? o.idBaiTap : undefined,
    tenBai: typeof o.tenBai === "string" ? o.tenBai : undefined,
    idNopBai: typeof o.idNopBai === "string" ? o.idNopBai : undefined,
    idCotMoc: typeof o.idCotMoc === "string" ? o.idCotMoc : undefined,
    slug: typeof o.slug === "string" ? o.slug : undefined,
  };
}

export function noiDungLopBaiStaff(
  loai: ChatLopBaiNotice["loai"],
  tenBai: string,
  tenHv: string,
): string {
  switch (loai) {
    case "mo_bai":
      return `Đã mở bài «${tenBai}» cho ${tenHv}.`;
    case "nop_bai":
      return `${tenHv} đã nộp bài «${tenBai}».`;
    case "luu_bai":
      return `Bài «${tenBai}» của ${tenHv} đã được lưu.`;
    case "journey_da_dang":
      return `${tenHv} đã đăng bài lên Journey.`;
  }
}

export function noiDungLopBaiChoHocVien(
  loai: ChatLopBaiNotice["loai"],
  tenBai: string,
): string {
  switch (loai) {
    case "mo_bai":
      return `Chúc mừng bạn được mở bài tập «${tenBai}» — mở Giáo trình để xem yêu cầu.`;
    case "nop_bai":
      return `Bạn đã nộp bài «${tenBai}».`;
    case "luu_bai":
      return `Bài «${tenBai}» của bạn đã được lưu — bạn có thể Đăng Journey.`;
    case "journey_da_dang":
      return `Bạn đã đăng bài lên Journey.`;
  }
}

/** Q4: chỉ HV đích + staff thấy tin cá nhân hóa. */
export function shouldShowLopBaiTin(input: {
  lopBai: ChatLopBaiNotice | null | undefined;
  viewerId: string;
  isStaff: boolean;
}): boolean {
  if (!input.lopBai) return true;
  if (input.isStaff) return true;
  return input.lopBai.idNguoiDung === input.viewerId;
}
