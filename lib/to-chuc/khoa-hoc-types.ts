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

/** `trang_thai_lop_enum` — per-lớp (`org_lop_hoc.trang_thai`). */
export type TrangThaiLop =
  | "sap_khai_giang"
  | "dang_hoc"
  | "da_ket_thuc"
  | "huy";

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

/** Bài tập khóa học — map `org_bai_tap`. */
export type BaiTapKhoaData = {
  id: string;
  tenBaiTap: string;
  moTa: string | null;
  videoYoutubeUrl: string | null;
  thumbnailUrl: string | null;
  giaoTrinhBaiId: string | null;
  /** Hiển thị công khai trên trang khóa (toggle Eye). */
  visible: boolean;
};

export type BaiTapKhoaDraft = Omit<BaiTapKhoaData, "id">;

/** Cách hiển thị mục bài tập cho khách — `org_khoa_hoc.bai_tap_hien_thi`. */
export type BaiTapSectionDisplayMode = "an" | "mot_phan" | "day_du";

export const BAI_TAP_SECTION_DISPLAY_DEFAULT: BaiTapSectionDisplayMode = "day_du";

/** Số card hiển thị trước overlay khi `mot_phan`. */
export const BAI_TAP_PARTIAL_VISIBLE_COUNT = 2;

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
  /** Mã lớp hiển thị (VD: HHK30) — null khi `ma_lop` nội bộ tự sinh. */
  maLop: string | null;
  /** Nhãn phụ: ca/lịch học (VD: Ca tối · T2-4-6). */
  tenLop: string | null;
  hinhThuc: HinhThucLop;
  lichHoc: string | null;
  ngayKhaiGiang: string;
  slotToiDa: number | null;
  trangThaiLop: TrangThaiLop;
  conCho: boolean;
  /** Tên giảng viên tự nhập khi chưa gắn user CINS. */
  giaoVienText: string | null;
  giaoVien: GiaoVienKhoaData;
  diaChiHoc: string | null;
};

export type LopHocFormInput = {
  maLop?: string | null;
  hinhThuc?: HinhThucLop;
  lichHoc?: string | null;
  ngayKhaiGiang?: string | null;
  giaoVienText?: string | null;
  slotToiDa?: number | null;
  trangThaiLop?: TrangThaiLop;
};

export type KhoaHocDetailPayload = {
  khoa: KhoaHocCardData;
  orgTen: string;
  giaoTrinh: GiaoTrinhBaiData[];
  lopHoc: LopHocDetailData[];
  giaoVien: GiaoVienKhoaData[];
  baiTap: BaiTapKhoaData[];
  baiTapDisplayMode: BaiTapSectionDisplayMode;
};
