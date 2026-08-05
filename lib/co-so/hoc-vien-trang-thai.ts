import {
  isEnrollmentNotFrozen,
  type KyHocInterval,
  todayYmdVn,
} from "@/lib/co-so/ky-hoc";

/**
 * 3 trạng thái hiển thị HV (không thêm enum DB):
 * - dang_hoc: còn kỳ hiệu lực (sau khi TV xác nhận nhận tiền)
 * - het_han: hết ngày học — tự suy từ org_ky_hoc (roster chỉ gồm HV đã có kỳ)
 * - nghi: TV gán thủ công (`tam_nghi` / `da_bo_hoc` / `da_hoan_thanh`)
 *
 * Ghi danh chưa có `org_ky_hoc` (= chưa đóng/xác nhận HP) không nằm trong tab
 * "Học viên" mà ở tab "Chờ xử lý" (`listHocVienCuaOrg` tách theo `roster`).
 */
export type TrangThaiHocVienHienThi = "dang_hoc" | "het_han" | "nghi";

export const TRANG_THAI_HV_HIEN_THI_LABEL: Record<
  TrangThaiHocVienHienThi,
  string
> = {
  dang_hoc: "Đang học",
  het_han: "Hết kỳ học",
  nghi: "Nghỉ",
};

const NGHI_DB = new Set(["tam_nghi", "da_bo_hoc", "da_hoan_thanh"]);

export function isTrangThaiNghiDb(trangThaiDb: string): boolean {
  return NGHI_DB.has(trangThaiDb);
}

export function resolveTrangThaiHienThi(
  trangThaiDb: string,
  intervals: KyHocInterval[],
  todayYmd = todayYmdVn(),
): TrangThaiHocVienHienThi {
  if (isTrangThaiNghiDb(trangThaiDb)) return "nghi";
  if (!isEnrollmentNotFrozen(intervals, todayYmd)) return "het_han";
  return "dang_hoc";
}

/** Filter query `trangThai` thuộc 3 trạng thái hiển thị. */
export function isTrangThaiHienThiFilter(
  value: string,
): value is TrangThaiHocVienHienThi {
  return value === "dang_hoc" || value === "het_han" || value === "nghi";
}
