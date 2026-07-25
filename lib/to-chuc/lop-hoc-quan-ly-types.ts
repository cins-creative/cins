import type {
  HinhThucLop,
  LoaiMoHinhKhoa,
  TrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-types";

/** Hàng bảng quản lý lớp — safe cho client (không server-only). */
export type LopHocQuanLyRow = {
  id: string;
  maLop: string | null;
  lichHoc: string | null;
  hinhThuc: HinhThucLop;
  ngayKhaiGiang: string;
  slotToiDa: number | null;
  trangThaiLop: TrangThaiLop;
  giaoVienPhuTrach: string | null;
  giaoVienText: string | null;
  giaoVienTen: string | null;
  khoaId: string;
  khoaSlug: string;
  tenKhoa: string;
  loaiMoHinh: LoaiMoHinhKhoa;
  soHocVien: number;
};
