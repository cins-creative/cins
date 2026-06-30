export type StudioJobStatus = "nhap" | "dang_mo" | "da_dong";
export type StudioJobLoaiHinh =
  | "toan_thoi_gian"
  | "ban_thoi_gian"
  | "remote"
  | "freelance"
  | "thuc_tap";

export type StudioJob = {
  id: string;
  tieuDe: string;
  moTa: string | null;
  loaiHinh: StudioJobLoaiHinh;
  capDo: string | null;
  tinhThanh: string | null;
  lamTuXa: boolean;
  mucLuongTu: number | null;
  mucLuongDen: number | null;
  hienThiLuong: boolean;
  hanNop: string | null;
  trangThai: StudioJobStatus;
  taoLuc: string | null;
};

export const STUDIO_JOB_LOAI_HINH_LABEL: Record<StudioJobLoaiHinh, string> = {
  toan_thoi_gian: "Toàn thời gian",
  ban_thoi_gian: "Bán thời gian",
  remote: "Remote",
  freelance: "Freelance",
  thuc_tap: "Thực tập",
};

export const STUDIO_JOB_STATUS_LABEL: Record<StudioJobStatus, string> = {
  nhap: "Nháp",
  dang_mo: "Đang mở",
  da_dong: "Đã đóng",
};

export const STUDIO_JOB_SELECT =
  "id, tieu_de, mo_ta, loai_hinh, cap_do, tinh_thanh, lam_tu_xa, muc_luong_tu, muc_luong_den, hien_thi_luong, han_nop, trang_thai, tao_luc";

type JobRow = {
  id: string;
  tieu_de: string;
  mo_ta: string | null;
  loai_hinh: string | null;
  cap_do: string | null;
  tinh_thanh: string | null;
  lam_tu_xa: boolean | null;
  muc_luong_tu: number | null;
  muc_luong_den: number | null;
  hien_thi_luong: boolean | null;
  han_nop: string | null;
  trang_thai: string | null;
  tao_luc: string | null;
};

export function mapStudioJobRow(row: JobRow): StudioJob {
  const loai = (row.loai_hinh ?? "toan_thoi_gian") as StudioJobLoaiHinh;
  const trangThai = (row.trang_thai ?? "dang_mo") as StudioJobStatus;
  return {
    id: row.id,
    tieuDe: row.tieu_de,
    moTa: row.mo_ta,
    loaiHinh: loai in STUDIO_JOB_LOAI_HINH_LABEL ? loai : "toan_thoi_gian",
    capDo: row.cap_do?.trim() || null,
    tinhThanh: row.tinh_thanh,
    lamTuXa: Boolean(row.lam_tu_xa),
    mucLuongTu: row.muc_luong_tu,
    mucLuongDen: row.muc_luong_den,
    hienThiLuong: Boolean(row.hien_thi_luong),
    hanNop: row.han_nop,
    trangThai: trangThai in STUDIO_JOB_STATUS_LABEL ? trangThai : "dang_mo",
    taoLuc: row.tao_luc,
  };
}
