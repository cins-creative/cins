import type { TruongTuyenSinhNamRow } from "@/lib/truong/types";

/** Khối tính điểm gắn phương thức xét tuyển của ngành trong năm (fallback: bất kỳ PT có khối cùng năm). */
export function findKhoiIdForProgram(
  tuyenSinh: TruongTuyenSinhNamRow[],
  truongNganhId: string,
  year: number,
): string | null {
  const id = truongNganhId.trim();
  if (!id) return null;

  for (const row of tuyenSinh) {
    if (row.nam !== year || row.truongNganhId !== id) continue;
    for (const pt of row.phuongThuc) {
      const khoi = pt.id_cau_hinh_khoi?.trim();
      if (khoi) return khoi;
    }
  }

  for (const row of tuyenSinh) {
    if (row.nam !== year) continue;
    for (const pt of row.phuongThuc) {
      const khoi = pt.id_cau_hinh_khoi?.trim();
      if (khoi) return khoi;
    }
  }

  return null;
}
