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

/** Hiển thị trang khóa trên cơ sở — lưu trong `noi_dung_blocks` meta. */
export type KhoaHocCheDoHienThi = "cong_khai" | "an";

/** Gói học phí — lưu meta `noi_dung_blocks`; cột `hoc_phi` = gói đầu (listing). */
export type GoiHocPhiKhoa = {
  id: string;
  tenGoi: string;
  hocPhi: number;
  soBuoi?: number | null;
  phutMoiBuoi?: number | null;
};

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
  /** Mã khóa nội bộ — `org_khoa_hoc.ma_khoa_hoc`. */
  maKhoaHoc: string | null;
  moTa: string | null;
  loaiMoHinh: LoaiMoHinhKhoa;
  trinhDoDauVao: TrinhDoDauVao;
  trangThaiKhoaHoc: TrangThaiKhoaHoc;
  cheDoHienThi: KhoaHocCheDoHienThi;
  thoiLuongBuoi: number | null;
  thoiLuongPhutMoiBuoi: number | null;
  hocPhi: number | null;
  /** Nhiều gói học phí — meta blocks; rỗng = dùng cột legacy. */
  goiHocPhi: GoiHocPhiKhoa[];
  /** Thumbnail danh sách khóa (`org_khoa_hoc.avatar_id`). */
  thumbnailId: string | null;
  thumbnailUrl: string | null;
  /** Banner trang chi tiết khóa (`org_khoa_hoc.cover_id`). */
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
  /**
   * Tập hình thức distinct từ các lớp chưa huỷ — rỗng = khóa trần (chưa mở lớp).
   * @deprecated `hinhThuc` giữ tương thích tạm (= phần tử đầu hoặc null).
   */
  hinhThucs: HinhThucLop[];
  /** @deprecated Dùng `hinhThucs` — giá trị lớp sớm nhất. */
  hinhThuc: HinhThucLop | null;
  /** Lịch mô tả khi mô hình liên tục (`org_lop_hoc.lich_hoc`). */
  lichHoc: string | null;
  /** Snapshot địa điểm legacy từ meta khóa — ưu tiên lấy từ lớp. */
  diaChiHoc: string | null;
  /** @deprecated Chi nhánh chuyển xuống lớp (`org_lop_hoc_chi_nhanh`). */
  chiNhanhIds: string[];
  yeuCauChuanBi: string | null;
};

export type TaoKhoaHocInput = {
  tenKhoaHoc: string;
  /** Mã khóa nội bộ (tuỳ chọn). */
  maKhoaHoc?: string | null;
  /** Đường dẫn URL khóa — mặc định slugify từ tên. */
  slug?: string | null;
  loaiMoHinh: LoaiMoHinhKhoa;
  moTa?: string | null;
  thoiLuongBuoi?: number | null;
  thoiLuongPhutMoiBuoi?: number | null;
  hocPhi?: number | null;
  goiHocPhi?: GoiHocPhiKhoa[];
  trinhDoDauVao?: TrinhDoDauVao;
  thumbnailId?: string | null;
  coverId?: string | null;
  yeuCauChuanBi?: string | null;
  cheDoHienThi?: KhoaHocCheDoHienThi;
};

export type CapNhatKhoaHocInput = TaoKhoaHocInput & {
  trangThaiKhoaHoc?: TrangThaiKhoaHoc;
};

export type VisibilityGiaoTrinh = "public" | "chi_hoc_vien" | "private";

/** Thuộc tính bài trong bộ giáo trình — `loai_bai_giao_trinh_enum`. */
export type LoaiBaiGiaoTrinh =
  | "bai_tap"
  | "ly_thuyet"
  | "tham_khao"
  | "demo"
  | "bai_mau"
  | "kiem_tra"
  | "du_an"
  | "on_tap";

export const LOAI_BAI_GIAO_TRINH_ORDER: LoaiBaiGiaoTrinh[] = [
  "bai_tap",
  "ly_thuyet",
  "tham_khao",
  "demo",
  "bai_mau",
  "kiem_tra",
  "du_an",
  "on_tap",
];

export const LOAI_BAI_GIAO_TRINH_LABEL: Record<LoaiBaiGiaoTrinh, string> = {
  bai_tap: "Bài tập",
  ly_thuyet: "Lý thuyết",
  tham_khao: "Tham khảo",
  demo: "Demo",
  bai_mau: "Bài mẫu",
  kiem_tra: "Kiểm tra",
  du_an: "Dự án",
  on_tap: "Ôn tập",
};

export function isLoaiBaiGiaoTrinh(value: unknown): value is LoaiBaiGiaoTrinh {
  return (
    typeof value === "string" &&
    (LOAI_BAI_GIAO_TRINH_ORDER as string[]).includes(value)
  );
}

/** Module bài tập (thư viện org) — map `org_bai_tap`. */
export type BaiTapKhoaData = {
  id: string;
  tenBaiTap: string;
  /** Nội dung bài tập (`mo_ta`). */
  moTa: string | null;
  /** Yêu cầu bài (`yeu_cau`). */
  yeuCau?: string | null;
  videoYoutubeUrl: string | null;
  thumbnailUrl: string | null;
  giaoTrinhBaiId: string | null;
  /**
   * Legacy schema — UI mới không toggle.
   * Khi đọc từ bộ: luôn true.
   */
  visible: boolean;
  /** Thuộc tính trong bộ đang xem (junction). */
  thuocTinh?: LoaiBaiGiaoTrinh;
};

export type BaiTapKhoaDraft = Omit<BaiTapKhoaData, "id">;

/** Module trong thư viện quản lý. */
export type BaiTapModuleData = {
  id: string;
  tenBaiTap: string;
  moTa: string | null;
  yeuCau: string | null;
  videoYoutubeUrl: string | null;
  thumbnailUrl: string | null;
  soBoDangDung: number;
  /** Bộ giáo trình đang gán module này. */
  boIds: string[];
  capNhatLuc: string;
};

export type BoGiaoTrinhBaiData = {
  baiTapId: string;
  tenBaiTap: string;
  moTa: string | null;
  yeuCau: string | null;
  videoYoutubeUrl: string | null;
  thumbnailUrl: string | null;
  thuocTinh: LoaiBaiGiaoTrinh;
  thuTu: number;
  ghiChu: string | null;
};

export type BoGiaoTrinhData = {
  id: string;
  tenBo: string;
  moTa: string | null;
  thuTu: number;
  soBai: number;
  khoaIds: string[];
  khoaTenList: string[];
};

export type BoGiaoTrinhChiTiet = BoGiaoTrinhData & {
  bai: BoGiaoTrinhBaiData[];
};

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
  avatarUrl: string | null;
  avatarId: string | null;
};

export type LopHocChiNhanhBrief = {
  id: string;
  ten: string;
  diaChi: string | null;
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
  /** Snapshot địa chỉ từ chi nhánh của lớp. */
  diaChiHoc: string | null;
  /** Chi nhánh gắn lớp (offline / kết hợp). */
  chiNhanhIds: string[];
  chiNhanh: LopHocChiNhanhBrief[];
};

export type LopHocFormInput = {
  maLop?: string | null;
  hinhThuc?: HinhThucLop;
  lichHoc?: string | null;
  ngayKhaiGiang?: string | null;
  /** User CINS phụ trách lớp (`org_lop_hoc.giao_vien_phu_trach`). */
  giaoVienPhuTrach?: string | null;
  giaoVienText?: string | null;
  slotToiDa?: number | null;
  trangThaiLop?: TrangThaiLop;
  /** Chi nhánh địa điểm — bắt buộc khi offline / kết hợp. */
  chiNhanhIds?: string[] | null;
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
