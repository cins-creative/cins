export type LoaiMoHinhKhoa = "cohort_co_dinh" | "lien_tuc_theo_thang";

/** `hinh_thuc_lop_enum` — per-lớp (`org_lop_hoc`). */
export type HinhThucLop = "truc_tiep" | "truc_tuyen" | "ket_hop";

export type TrinhDoDauVao =
  | "co_ban"
  | "trung_cap"
  | "nang_cao"
  | "khong_yeu_cau";

export type TrangThaiKhoaHoc =
  | "sap_khai_giang"
  | "dang_mo_don"
  | "dang_hoc"
  | "da_ket_thuc"
  | "tam_dung";

export type KhoaHocCardData = {
  id: string;
  slug: string;
  tenKhoaHoc: string;
  moTa: string | null;
  loaiMoHinh: LoaiMoHinhKhoa;
  trinhDoDauVao: TrinhDoDauVao;
  trangThaiKhoaHoc: TrangThaiKhoaHoc;
  thoiLuongBuoi: number | null;
  thoiLuongPhutMoiBuoi: number | null;
  hocPhi: number | null;
  coverId: string | null;
  coverUrl: string | null;
  soLopMo: number;
  soHocVien: number;
  /** Ngày khai giảng sớm nhất từ lớp đang mở (`org_lop_hoc`), ISO `YYYY-MM-DD`. */
  ngayKhaiGiangGanNhat: string | null;
  /** Chỉ số 0–2 cho gradient placeholder khi chưa có ảnh bìa. */
  coverVariant: number;
  /** Lớp đầu tiên (form sửa / quản lý). */
  lopId: string | null;
  hinhThuc: HinhThucLop | null;
  /** Lịch mô tả khi mô hình liên tục (`org_lop_hoc.lich_hoc`). */
  lichHoc: string | null;
  diaChiHoc: string | null;
  yeuCauChuanBi: string | null;
};

export type TaoKhoaHocInput = {
  tenKhoaHoc: string;
  loaiMoHinh: LoaiMoHinhKhoa;
  moTa?: string | null;
  thoiLuongBuoi?: number | null;
  thoiLuongPhutMoiBuoi?: number | null;
  hocPhi?: number | null;
  trinhDoDauVao?: TrinhDoDauVao;
  coverId?: string | null;
  /** Bắt buộc khi `loaiMoHinh === cohort_co_dinh`. ISO `YYYY-MM-DD`. */
  ngayKhaiGiang?: string | null;
  hinhThuc?: HinhThucLop;
  /** Bắt buộc khi học offline / kết hợp. */
  diaChiHoc?: string | null;
  /** Mô tả lịch khai giảng khi mô hình liên tục. */
  lichHoc?: string | null;
  yeuCauChuanBi?: string | null;
};

export type CapNhatKhoaHocInput = TaoKhoaHocInput & {
  trangThaiKhoaHoc?: TrangThaiKhoaHoc;
};

export type VisibilityGiaoTrinh = "public" | "chi_hoc_vien" | "private";

export type GiaoTrinhBaiData = {
  id: string;
  thuTu: number;
  tieuDe: string;
  moTaNgan: string | null;
  soBuoi: number | null;
  visibility: VisibilityGiaoTrinh;
  hasVideo: boolean;
};

export type GiaoVienKhoaData = {
  key: string;
  ten: string;
  slug: string | null;
  verified: boolean;
  initials: string;
  vaiTro: string | null;
  pendingProfile: boolean;
};

export type LopHocDetailData = {
  id: string;
  tenLop: string;
  hinhThuc: HinhThucLop;
  lichHoc: string | null;
  ngayKhaiGiang: string;
  slotToiDa: number | null;
  trangThaiLop: string;
  conCho: boolean;
  giaoVien: GiaoVienKhoaData;
  diaChiHoc: string | null;
};

export type KhoaHocDetailPayload = {
  khoa: KhoaHocCardData;
  orgTen: string;
  giaoTrinh: GiaoTrinhBaiData[];
  lopHoc: LopHocDetailData[];
  giaoVien: GiaoVienKhoaData[];
};
