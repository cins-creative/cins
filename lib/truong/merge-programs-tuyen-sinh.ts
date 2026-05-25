import {
  mapChiTieuFromTuyenSinhNam,
  mapDiemChuanFromTuyenSinhNam,
  type RawTuyenSinhNamRow,
} from "@/lib/truong/diem-chuan";
import type { TruongNganhProgram, TruongTuyenSinhNamRow } from "@/lib/truong/types";

/** Supabase embed có thể trả 1 object hoặc mảng. */
export function normalizeTuyenSinhNamEmbed(
  raw: RawTuyenSinhNamRow[] | RawTuyenSinhNamRow | null | undefined,
): RawTuyenSinhNamRow[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function mergeYearMaps(
  base: Record<string, number | null> | undefined,
  extra: Record<string, number> | undefined,
): Record<string, number | null> | undefined {
  if (!extra || !Object.keys(extra).length) return base;
  return { ...base, ...extra };
}

/**
 * Gộp `org_tuyen_sinh_nam` (fetch riêng hoặc embed) vào từng `org_truong_nganh`
 * theo `truongNganhId` / `program.id`.
 */
export function mergeTuyenSinhIntoPrograms(
  programs: TruongNganhProgram[],
  tuyenSinh: TruongTuyenSinhNamRow[],
): TruongNganhProgram[] {
  if (!tuyenSinh.length) return programs;

  const byProgramId = new Map<string, RawTuyenSinhNamRow[]>();
  for (const row of tuyenSinh) {
    const pid = row.truongNganhId?.trim();
    if (!pid) continue;
    const list = byProgramId.get(pid) ?? [];
    list.push({
      nam: row.nam,
      diem_chuan: row.diem_chuan,
      chi_tieu: row.chi_tieu,
    });
    byProgramId.set(pid, list);
  }

  return programs.map((prog) => {
    const rows = byProgramId.get(prog.id);
    if (!rows?.length) return prog;

    const fromEmbed = mapDiemChuanFromTuyenSinhNam(rows);
    const chiFromEmbed = mapChiTieuFromTuyenSinhNam(rows);

    return {
      ...prog,
      diemChuanByYear: mergeYearMaps(prog.diemChuanByYear, fromEmbed),
      chiTieuByYear: mergeYearMaps(prog.chiTieuByYear, chiFromEmbed),
    };
  });
}
