import {
  currentCalendarYear,
  defaultTruongNganhYear,
  diemChuanRows,
  parseTruongNumericField,
  TRUONG_NGANH_YEAR_OPTIONS,
} from "./diem-chuan";
import { collectCalendarYearsFromRow } from "./timeline-moc";
import type { TruongNganhProgram, TruongTuyenSinhNamRow } from "./types";

function addProgramYearsWithData(
  years: Set<number>,
  programs: TruongNganhProgram[],
): void {
  for (const prog of programs) {
    for (const { year } of diemChuanRows(prog)) {
      years.add(year);
    }
    const chiTieuMap = prog.chiTieuByYear;
    if (!chiTieuMap) continue;
    for (const [key, raw] of Object.entries(chiTieuMap)) {
      if (raw == null || Number.isNaN(raw)) continue;
      const year = Number(key);
      if (!Number.isNaN(year) && year > 0) years.add(year);
    }
  }
}

/** Năm có ít nhất một trường tuyển sinh có dữ liệu (điểm, chỉ tiêu, PT, lịch). */
export function tuyenSinhRowHasYearData(row: TruongTuyenSinhNamRow): boolean {
  if (parseTruongNumericField(row.diem_chuan) != null) return true;
  if (parseTruongNumericField(row.chi_tieu) != null) return true;
  if (row.phuongThuc?.length) return true;
  return [
    row.ngay_mo_ho_so,
    row.ngay_dong_ho_so,
    row.ngay_thi_tu,
    row.ngay_thi_den,
    row.ngay_cong_bo_diem,
    row.ngay_xac_nhan_nhap_hoc_tu,
    row.ngay_xac_nhan_nhap_hoc_den,
    row.ghi_chu_timeline,
  ].some((v) => typeof v === "string" && v.trim().length > 0);
}

export function mergeTruongYearOptions(
  programs: TruongNganhProgram[],
  tuyenSinh: TruongTuyenSinhNamRow[],
  _cauHinhYears: number[] = [],
): number[] {
  const years = new Set<number>();
  addProgramYearsWithData(years, programs);
  for (const row of tuyenSinh) {
    for (const y of collectCalendarYearsFromRow(row)) {
      years.add(y);
    }
    if (row.nam > 0 && tuyenSinhRowHasYearData(row)) {
      years.add(row.nam);
    }
  }
  if (years.size === 0) return [...TRUONG_NGANH_YEAR_OPTIONS];
  return [...years].sort((a, b) => b - a);
}

/** Năm gợi ý khi bấm «Thêm dữ liệu» (ưu tiên năm lịch nếu chưa có trong DB). */
export function suggestYearForAdd(yearOptions: number[]): number {
  const calendar = currentCalendarYear();
  if (!yearOptions.includes(calendar)) return calendar;
  if (!yearOptions.length) return calendar;
  return Math.max(...yearOptions) + 1;
}

/** Năm đầu tiên (mới → cũ) còn ít nhất một ngành chưa có `org_tuyen_sinh_nam`. */
export function pickYearWithAddableSlots(
  yearChoices: number[],
  programIds: string[],
  tuyenSinh: TruongTuyenSinhNamRow[],
): number | null {
  const ids = new Set(programIds);
  for (const y of yearChoices) {
    const occupied = new Set(
      tuyenSinh
        .filter((r) => Number(r.nam) === y && ids.has(r.truongNganhId))
        .map((r) => r.truongNganhId),
    );
    if (ids.size > occupied.size) return y;
  }
  return null;
}

/** Năm mặc định filter: năm lịch − 1; không có thì năm gần nhất ≤ đó, rồi năm trong list. */
export function pickDefaultTruongYear(
  yearOptions: number[],
  _cauHinhYears: number[] = [],
): number {
  const preferred = defaultTruongNganhYear();
  if (!yearOptions.length) return preferred;
  if (yearOptions.includes(preferred)) return preferred;
  const atOrBefore = yearOptions.filter((y) => y <= preferred);
  if (atOrBefore.length) return Math.max(...atOrBefore);
  return Math.min(...yearOptions);
}

/** Năm lớn nhất trong danh sách (yearOptions đã sort giảm dần). */
export function pickMaxTruongYear(yearOptions: number[]): number {
  if (!yearOptions.length) return defaultTruongNganhYear();
  return Math.max(...yearOptions);
}
