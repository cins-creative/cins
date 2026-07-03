import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";
import { normalizeGiaiDoanMucTieu } from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  normalizeStudioPhucLoi,
  type StudioJobPhucLoiItem,
} from "@/lib/to-chuc/studio-phuc-loi";

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
  yeuCau: string | null;
  /** Ghi chú quyền lợi dạng text (legacy) — hiển thị fallback khi phucLoi rỗng. */
  quyenLoi: string | null;
  /** Phúc lợi có cấu trúc (tick + ghi chú theo mục). */
  phucLoi: StudioJobPhucLoiItem[];
  moTaNgan: string | null;
  loaiHinh: StudioJobLoaiHinh;
  capDo: string | null;
  tinhThanh: string | null;
  lamTuXa: boolean;
  idLinhVuc: string | null;
  linhVucTen: string | null;
  /** FK tới trang nghề (vị trí công việc chuẩn) — null nếu vị trí tự do. */
  idNghe: string | null;
  ngheSlug: string | null;
  ngheTieuDe: string | null;
  mucLuongTu: number | null;
  mucLuongDen: number | null;
  hienThiLuong: boolean;
  soLuong: number | null;
  hanNop: string | null;
  hienThiCoHoi: boolean;
  giaiDoanMucTieu: GiaiDoan[];
  trangThai: StudioJobStatus;
  taoLuc: string | null;
};

/** Option nghề cho picker "vị trí công việc" trong form tuyển dụng. */
export type StudioNgheOption = {
  id: string;
  slug: string;
  /** Tiêu đề đầy đủ của trang nghề. */
  tieuDe: string;
  /** Tên vị trí ngắn (phần trước ngoặc). */
  roleShort: string;
  roleEng: string | null;
  linhVucTen: string | null;
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
  "id, tieu_de, mo_ta, yeu_cau, quyen_loi, phuc_loi, mo_ta_ngan, loai_hinh, cap_do, tinh_thanh, lam_tu_xa, id_linh_vuc, id_nghe, muc_luong_tu, muc_luong_den, hien_thi_luong, so_luong, han_nop, hien_thi_co_hoi, giai_doan_muc_tieu, trang_thai, tao_luc, linh_vuc:linh_vuc(id, ten), nghe:id_nghe(id, slug, tieu_de, tieu_de_viet)";

type JobRow = {
  id: string;
  tieu_de: string;
  mo_ta: string | null;
  yeu_cau: string | null;
  quyen_loi: string | null;
  phuc_loi: unknown;
  mo_ta_ngan: string | null;
  loai_hinh: string | null;
  cap_do: string | null;
  tinh_thanh: string | null;
  lam_tu_xa: boolean | null;
  id_linh_vuc: string | null;
  id_nghe: string | null;
  muc_luong_tu: number | null;
  muc_luong_den: number | null;
  hien_thi_luong: boolean | null;
  so_luong: number | null;
  han_nop: string | null;
  hien_thi_co_hoi: boolean | null;
  giai_doan_muc_tieu: string[] | null;
  trang_thai: string | null;
  tao_luc: string | null;
  linh_vuc?: { id: string; ten: string | null } | { id: string; ten: string | null }[] | null;
  nghe?: NgheEmbed | NgheEmbed[] | null;
};

type NgheEmbed = {
  id: string;
  slug: string | null;
  tieu_de: string | null;
  tieu_de_viet: string | null;
};

function pickLinhVucTen(
  linhVuc: JobRow["linh_vuc"],
): string | null {
  if (!linhVuc) return null;
  const row = Array.isArray(linhVuc) ? linhVuc[0] : linhVuc;
  return row?.ten?.trim() || null;
}

function pickNghe(nghe: JobRow["nghe"]): NgheEmbed | null {
  if (!nghe) return null;
  return Array.isArray(nghe) ? nghe[0] ?? null : nghe;
}

export function mapStudioJobRow(row: JobRow): StudioJob {
  const loai = (row.loai_hinh ?? "toan_thoi_gian") as StudioJobLoaiHinh;
  const trangThai = (row.trang_thai ?? "dang_mo") as StudioJobStatus;
  const nghe = pickNghe(row.nghe);
  return {
    id: row.id,
    tieuDe: row.tieu_de,
    moTa: row.mo_ta,
    yeuCau: row.yeu_cau,
    quyenLoi: row.quyen_loi,
    phucLoi: normalizeStudioPhucLoi(row.phuc_loi),
    moTaNgan: row.mo_ta_ngan,
    loaiHinh: loai in STUDIO_JOB_LOAI_HINH_LABEL ? loai : "toan_thoi_gian",
    capDo: row.cap_do?.trim() || null,
    tinhThanh: row.tinh_thanh,
    lamTuXa: Boolean(row.lam_tu_xa),
    idLinhVuc: row.id_linh_vuc,
    linhVucTen: pickLinhVucTen(row.linh_vuc),
    idNghe: row.id_nghe,
    ngheSlug: nghe?.slug?.trim() || null,
    ngheTieuDe:
      nghe?.tieu_de_viet?.trim() || nghe?.tieu_de?.trim() || null,
    mucLuongTu: row.muc_luong_tu,
    mucLuongDen: row.muc_luong_den,
    hienThiLuong: Boolean(row.hien_thi_luong),
    soLuong: row.so_luong,
    hanNop: row.han_nop,
    hienThiCoHoi: row.hien_thi_co_hoi !== false,
    giaiDoanMucTieu: normalizeGiaiDoanMucTieu(row.giai_doan_muc_tieu),
    trangThai: trangThai in STUDIO_JOB_STATUS_LABEL ? trangThai : "dang_mo",
    taoLuc: row.tao_luc,
  };
}
