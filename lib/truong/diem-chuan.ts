import type { TruongNganhProgram } from "./types";

/** Các năm mặc định trên filter khi chưa có dữ liệu `org_tuyen_sinh_nam`. */
export const TRUONG_NGANH_YEAR_OPTIONS = [2025, 2024, 2023, 2022] as const;

export type TruongNganhYear = (typeof TRUONG_NGANH_YEAR_OPTIONS)[number];

export type DiemChuanYearRow = {
  year: number;
  diem: number;
};

export function defaultTruongNganhYear(): number {
  return new Date().getFullYear();
}

export function formatDiemChuan(diem: number | null | undefined): string {
  if (diem == null || Number.isNaN(diem)) return "—";
  return (Math.round(diem * 100) / 100).toFixed(2);
}

export function diemChuanForYear(
  prog: TruongNganhProgram,
  year: number,
): number | null {
  const raw = prog.diemChuanByYear?.[String(year)];
  if (raw == null || Number.isNaN(raw)) return null;
  return raw;
}

export function hasAnyDiemChuan(prog: TruongNganhProgram): boolean {
  return diemChuanRows(prog).length > 0;
}

/** Các năm có điểm chuẩn trong DB, mới nhất trước. */
export function diemChuanRows(prog: TruongNganhProgram): DiemChuanYearRow[] {
  const map = prog.diemChuanByYear;
  if (!map) return [];
  const rows: DiemChuanYearRow[] = [];
  for (const [yearKey, raw] of Object.entries(map)) {
    const year = Number(yearKey);
    if (Number.isNaN(year) || year <= 0) continue;
    if (raw == null || Number.isNaN(raw)) continue;
    rows.push({ year, diem: raw });
  }
  return rows.sort((a, b) => b.year - a.year);
}

/** Chiều rộng thanh so với điểm cao nhất trong cùng ngành. */
export function diemChuanBarPercent(diem: number, maxDiem: number): number {
  if (maxDiem <= 0) return 0;
  return Math.min(100, Math.round((diem / maxDiem) * 100));
}

/** Gộp năm từ mọi chương trình trường; fallback mock nếu chưa seed. */
export function mergeYearOptionsFromPrograms(
  programs: TruongNganhProgram[],
): number[] {
  const years = new Set<number>();
  for (const prog of programs) {
    for (const { year } of diemChuanRows(prog)) {
      years.add(year);
    }
  }
  if (years.size === 0) return [...TRUONG_NGANH_YEAR_OPTIONS];
  return [...years].sort((a, b) => b - a);
}

export type RawTuyenSinhNamRow = {
  nam?: number | string | null;
  diem_chuan?: number | string | null;
  chi_tieu?: number | string | null;
};

function parseYear(row: RawTuyenSinhNamRow): number | null {
  const year =
    typeof row.nam === "number" ? row.nam : Number(String(row.nam ?? "").trim());
  if (Number.isNaN(year) || year <= 0) return null;
  return year;
}

/** null / "" không được coi là 0 (tránh hiển thị điểm chuẩn & chỉ tiêu sai). */
export function parseTruongNumericField(
  raw: number | string | null | undefined,
): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Map `org_tuyen_sinh_nam` embed → record theo năm. */
export function mapDiemChuanFromTuyenSinhNam(
  rows: RawTuyenSinhNamRow[] | null | undefined,
): Record<string, number> | undefined {
  if (!rows?.length) return undefined;
  const out: Record<string, number> = {};
  for (const row of rows) {
    const year = parseYear(row);
    const diem = parseTruongNumericField(row.diem_chuan);
    if (year == null || diem == null) continue;
    out[String(year)] = diem;
  }
  return Object.keys(out).length ? out : undefined;
}

export function mapChiTieuFromTuyenSinhNam(
  rows: RawTuyenSinhNamRow[] | null | undefined,
): Record<string, number> | undefined {
  if (!rows?.length) return undefined;
  const out: Record<string, number> = {};
  for (const row of rows) {
    const year = parseYear(row);
    const ct = parseTruongNumericField(row.chi_tieu);
    if (year == null || ct == null) continue;
    out[String(year)] = ct;
  }
  return Object.keys(out).length ? out : undefined;
}

export function chiTieuForYear(
  prog: TruongNganhProgram,
  year: number,
): number | null {
  const raw = prog.chiTieuByYear?.[String(year)];
  if (raw == null || Number.isNaN(raw)) return null;
  return raw;
}

/** Parse JSON meta khi CMS lưu điểm theo năm (dự phòng). */
export function parseDiemChuanByYear(
  meta: unknown,
): Record<string, number> | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const src =
    "diem_chuan" in meta
      ? (meta as { diem_chuan?: unknown }).diem_chuan
      : "diemChuanByYear" in meta
        ? (meta as { diemChuanByYear?: unknown }).diemChuanByYear
        : undefined;
  if (!src || typeof src !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isNaN(n)) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}
