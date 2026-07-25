import type { CoSoStaffVaiTro } from "@/lib/to-chuc/co-so-vai-tro";

/**
 * Types/constants dùng chung client + server cho ma trận phân quyền
 * "Cài đặt tối cao". KHÔNG import gì server-only ở đây — file này được
 * `CoSoCaiDatToiCaoClient` ("use client") import trực tiếp.
 */

/** 7 module trong ma trận phân quyền "Cài đặt tối cao". */
export type CoSoModuleKey =
  | "co-so"
  | "chi-nhanh"
  | "khoa-lop"
  | "hoc-vien"
  | "diem-danh"
  | "hoc-phi-goi"
  | "hoc-phi-doi-soat";

export const CO_SO_MODULE_KEYS: CoSoModuleKey[] = [
  "co-so",
  "chi-nhanh",
  "khoa-lop",
  "hoc-vien",
  "diem-danh",
  "hoc-phi-goi",
  "hoc-phi-doi-soat",
];

export const CO_SO_MODULE_LABELS: Record<CoSoModuleKey, string> = {
  "co-so": "Cơ sở",
  "chi-nhanh": "Chi nhánh",
  "khoa-lop": "Khóa & lớp",
  "hoc-vien": "Học viên",
  "diem-danh": "Điểm danh",
  "hoc-phi-goi": "Gói học phí",
  "hoc-phi-doi-soat": "Doanh thu & đối soát",
};

export function isCoSoModuleKey(value: string): value is CoSoModuleKey {
  return (CO_SO_MODULE_KEYS as string[]).includes(value);
}

/** "an" = ẩn (mặc định khi không có row) · "xem" = chỉ đọc · "sua" = đọc + ghi. */
export type CoSoMucQuyen = "an" | "xem" | "sua";

/**
 * Founder tier: owner (hệ thống CINs, org tạo qua admin) hoặc admin (người sáng lập/được
 * phong). Luôn full quyền mọi module, không qua ma trận `org_thanh_vien_quyen`.
 */
export function isCoSoFounderTier(
  vaiTro: CoSoStaffVaiTro | null | undefined,
): boolean {
  return vaiTro === "owner" || vaiTro === "admin";
}
