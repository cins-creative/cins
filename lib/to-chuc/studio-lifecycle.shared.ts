/** Trạng thái hoạt động studio — shared client/server (không server-only). */

export type StudioHoatDongStatus =
  | "dang_hoat_dong"
  | "tam_ngung"
  | "da_dong_cua";

export type StudioLifecycleAction = "pause" | "resume" | "close";

export function normalizeStudioHoatDong(
  raw: string | null | undefined,
): StudioHoatDongStatus {
  if (raw === "tam_ngung" || raw === "da_dong_cua") return raw;
  return "dang_hoat_dong";
}
