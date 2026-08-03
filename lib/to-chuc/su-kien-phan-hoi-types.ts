/** Client-safe — loại phản hồi sự kiện (không server-only). */

export const LOAI_PHAN_HOI_SU_KIEN = ["quan_tam", "se_tham_gia"] as const;
export type LoaiPhanHoiSuKien = (typeof LOAI_PHAN_HOI_SU_KIEN)[number];

const LOAI_SET = new Set<string>(LOAI_PHAN_HOI_SU_KIEN);

export function isLoaiPhanHoiSuKien(
  value: unknown,
): value is LoaiPhanHoiSuKien {
  return typeof value === "string" && LOAI_SET.has(value);
}
