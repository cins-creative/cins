import { suggestYearForAdd } from "@/lib/truong/year-options";
import type { TruongTuyenSinhNamRow } from "@/lib/truong/types";

export function isValidTruongYear(y: number): boolean {
  return Number.isFinite(y) && y >= 2000 && y <= 2100;
}

/** Năm hiển thị trên thanh tab (DB + filter + năm đang chọn). */
export function collectTruongYearTabs(
  tuyenSinh: TruongTuyenSinhNamRow[],
  yearOptions: number[],
  activeYear: number,
): number[] {
  const s = new Set(yearOptions);
  for (const r of tuyenSinh) {
    if (r.nam > 0) s.add(Number(r.nam));
  }
  if (activeYear > 0) s.add(activeYear);
  return [...s].sort((a, b) => b - a);
}

export function nextSuggestedTruongYear(
  tabYears: number[],
  yearOptions: number[],
): number {
  const merged = [...tabYears, ...yearOptions];
  return suggestYearForAdd(merged.length ? merged : yearOptions);
}
