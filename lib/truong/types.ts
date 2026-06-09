import type { Block } from "@/lib/editor/types";
import type { PersonalFilterRef } from "@/lib/filter/types";

export type TruongOrgLoai = "truong_dai_hoc" | "co_so_dao_tao";

export type TruongChiNhanh = {
  id: string;
  ten: string;
  dia_chi: string;
  tinh_thanh: string | null;
  dien_thoai?: string | null;
  email?: string | null;
  website?: string | null;
  facebook?: string | null;
};

export type TruongListItem = {
  id: string;
  slug: string;
  ten: string;
  /** Phân loại listing — mặc định trường ĐH. */
  org_loai?: TruongOrgLoai;
  logo_id: string | null;
  avatar_id: string | null;
  /** URL imagedelivery đã resolve (server/API), không lưu DB */
  avatar_src?: string | null;
  cover_id: string | null;
  cover_src?: string | null;
  mo_ta: string | null;
  /** HTML rich text — popup giới thiệu trường */
  gioi_thieu_truong: string | null;
  tinh_thanh: string | null;
  dia_chi: string | null;
  /** Chi nhánh / cơ sở — lưu trong `org_to_chuc.cau_hinh.chi_nhanh`. */
  chi_nhanh?: TruongChiNhanh[];
  dien_thoai: string | null;
  email_lien_he: string | null;
  ma_truong: string | null;
  loai_truong: string | null;
  website: string | null;
  /** Fanpage Facebook — `org_to_chuc.cau_hinh.facebook`. */
  facebook?: string | null;
  ten_chinh_thuc: string | null;
  ten_tieng_anh: string | null;
  nam_thanh_lap: number | null;
  /** Cơ sở đào tạo — `org_co_so_dao_tao.giay_phep_dao_tao`. */
  giay_phep_dao_tao?: string | null;
  hoc_phi_nam_tu: number | null;
  hoc_phi_nam_den: number | null;
  co_ktx: boolean | null;
  ktx_gia_thang: number | null;
  nganhCount: number;
  nganhTags: string[];
};

export type TruongNganhProgram = {
  id: string;
  programSlug: string | null;
  nganhSlug: string;
  nganhTitle: string;
  ma_nganh: string | null;
  ten_chuong_trinh: string | null;
  he_dao_tao: string | null;
  thoi_gian_thang: number | null;
  cover_id: string | null;
  /** URL imagedelivery — resolve server từ `cover_id` bài ngành. */
  cover_src?: string | null;
  tom_tat: string | null;
  tieu_de_eng: string | null;
  diemChuanByYear?: Record<string, number | null>;
  chiTieuByYear?: Record<string, number | null>;
};

export type TruongDetail = TruongListItem & {
  programs: TruongNganhProgram[];
};

export type TruongStats = {
  year: number;
  diemChuanMax: number | null;
  chiTieuTong: number | null;
  hocPhiLabel: string | null;
  journeyCount: number;
};

export type TruongBaiDang = {
  id: string;
  loai_bai_dang: string | null;
  tieu_de: string;
  tom_tat: string | null;
  noi_dung: string | null;
  /** Block editor — cùng format Journey (`content_tac_pham.noi_dung_blocks`). */
  noiDungBlocks?: Block[] | null;
  cover_id: string | null;
  /** URL imagedelivery — resolve server khi fetch. */
  cover_src?: string | null;
  tao_luc: string | null;
  /** `nhap` + `tao_luc` tương lai = hẹn đăng (chỉ admin thấy trên timeline). */
  trang_thai?: string | null;
  tags: { label: string; slug: string }[];
  /** Nhãn tùy chỉnh (`filter_nhan` + `filter_gan`). */
  personalFilters?: PersonalFilterRef[];
  personalFilterSlugs?: string[];
  /** Hydrate per viewer — không cache trong `getTruongPagePayload`. */
  viewerBookmarked?: boolean;
  bookmarkCount?: number;
};

export type TruongHinhAnh = {
  id: string;
  cloudflare_id: string;
  caption: string | null;
  loai: string | null;
  thu_tu: number | null;
  /** URL hiển thị — resolve trên server khi fetch. */
  src?: string | null;
};

export type TruongPhuongThuc = {
  id: string;
  ten_phuong_thuc: string | null;
  chi_tieu_phuong_thuc: number | null;
  ap_dung_tat_ca_nganh: boolean | null;
  id_nganh_ap_dung?: string[] | null;
  id_cau_hinh_khoi: string | null;
  tieu_chi: unknown;
};

export type TruongTuyenSinhNamRow = {
  id: string;
  nam: number;
  chi_tieu: number | null;
  diem_chuan: number | null;
  tinh_trang: string | null;
  ngay_mo_ho_so: string | null;
  ngay_dong_ho_so: string | null;
  ngay_thi_tu: string | null;
  ngay_thi_den: string | null;
  ngay_cong_bo_diem: string | null;
  ngay_xac_nhan_nhap_hoc_tu: string | null;
  ngay_xac_nhan_nhap_hoc_den: string | null;
  ghi_chu_timeline: string | null;
  link_thong_tin: string | null;
  truongNganhId: string;
  programSlug: string | null;
  nganhTitle: string | null;
  phuongThuc: TruongPhuongThuc[];
};

export type TruongJourneyMember = {
  id: string;
  vai_tro: string | null;
  nam_bat_dau: number | null;
  displayName: string;
  nganhLabel: string | null;
};

export type TruongCauHinhMon = {
  id_mon_thi: string;
  ten: string;
  loai: string | null;
  ma?: string | null;
  thumbnail_id?: string | null;
  /** URL imagedelivery — resolve server từ thumbnail_id / cover bài viết. */
  thumbnail_url?: string | null;
  he_so: number;
  thang_diem: number;
  thoi_gian_phut: number | null;
  so_thu_tu: number;
  ghi_chu: string | null;
};

export type TruongKhoiThiMeta = {
  id: string;
  ma: string | null;
  ten: string | null;
};

export type TruongCauHinhTinhDiem = {
  id: string;
  quy_ve_thang: number;
  diem_san_xet_tuyen: number | null;
  co_diem_uu_tien: boolean;
  co_diem_thuong: boolean;
  /** Năm của bản ghi org_cau_hinh_khoi (có thể khác năm filter khi fallback) */
  nam_ap_dung?: number;
  /** org_truong_nganh.id khi khối gắn per ngành */
  id_truong_nganh?: string | null;
  /** edu_to_hop_mon (H00, V00, …) */
  khoiThi?: TruongKhoiThiMeta | null;
  mon: TruongCauHinhMon[];
};

export type TruongPagePayload = {
  school: TruongDetail;
  stats: TruongStats;
  baidang: TruongBaiDang[];
  hinhanh: TruongHinhAnh[];
  tuyenSinh: TruongTuyenSinhNamRow[];
  journeyMembers: TruongJourneyMember[];
  /** Các năm có bản ghi org_cau_hinh_khoi (để chọn filter). */
  cauHinhYears: number[];
  /** Cache server: `${org_truong_nganh.id}:${nam}` → cấu hình môn thi. */
  cauHinhMonThiByKey: Record<string, TruongCauHinhTinhDiem>;
};
