import {
  chiTieuForYear,
  diemChuanForYear,
} from "@/lib/truong/diem-chuan";
import { formatHocPhiLabel } from "@/lib/truong/display";
import type { TruongNganhProgram, TruongStats } from "@/lib/truong/types";

/** Tổng hợp số liệu sidebar từ `org_truong_nganh` + `org_tuyen_sinh_nam` đã merge vào programs. */
export function computeTruongStatsForYear(
  programs: TruongNganhProgram[],
  year: number,
  hocPhiTu: number | null,
  hocPhiDen: number | null,
  journeyCount: number,
): TruongStats {
  const diems: number[] = [];
  let chiSum = 0;
  let hasChi = false;

  for (const prog of programs) {
    const d = diemChuanForYear(prog, year);
    if (d != null) diems.push(d);
    const ct = chiTieuForYear(prog, year);
    if (ct != null) {
      chiSum += ct;
      hasChi = true;
    }
  }

  return {
    year,
    diemChuanMax: diems.length ? Math.max(...diems) : null,
    chiTieuTong: hasChi ? chiSum : null,
    hocPhiLabel: formatHocPhiLabel(hocPhiTu, hocPhiDen),
    journeyCount,
  };
}
